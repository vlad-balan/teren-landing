/**
 * Бэкенд лендинга ««Династия Дерева»»:
 *  - раздаёт статику лендинга;
 *  - принимает заявки POST /api/leads и хранит их в SQLite;
 *  - заявки с одинаковым телефоном объединяются в один контакт
 *    (каждое обращение сохраняется в историю lead_messages);
 *  - админ-панель /admin (вход по паролю из config).
 *
 * Запуск:  npm start  (в папке server)
 */
import express from 'express';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

/* ---------- Конфиг (можно переопределить через переменные окружения) ---------- */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'leads.db');

/* ---------- База данных ---------- */
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT    NOT NULL,          -- телефон в отображаемом виде
    phone_norm TEXT    NOT NULL UNIQUE,   -- только цифры, ключ объединения заявок
    name       TEXT,                      -- имя (обновляется на последнее непустое)
    status     TEXT    NOT NULL DEFAULT 'new',  -- new | done
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT                          -- дата последнего обращения
  );

  CREATE TABLE IF NOT EXISTS lead_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    form       TEXT    NOT NULL,          -- hero | cta | quiz | modal ...
    subject    TEXT,                      -- тема заявки (с какой кнопки пришли)
    comment    TEXT,                      -- комментарий клиента
    quiz       TEXT,                      -- JSON с ответами квиза / строка ответов
    attachment TEXT,                      -- имя сохранённого файла на сервере
    attachment_name TEXT,                 -- исходное имя файла (для показа)
    meta       TEXT,                      -- JSON: ip, user-agent, referer
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

/* Миграция: колонки вложений для существующей базы */
for (const col of ['attachment', 'attachment_name']) {
  const has = db.prepare(`PRAGMA table_info(lead_messages)`).all().some((c) => c.name === col);
  if (!has) db.exec(`ALTER TABLE lead_messages ADD COLUMN ${col} TEXT`);
}

/* Миграция старой базы (до объединения заявок): перенос полей в историю */
const hasOldColumns = db
  .prepare(`PRAGMA table_info(leads)`)
  .all()
  .some((c) => c.name === 'form');

if (hasOldColumns) {
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN phone_norm TEXT`);
  } catch { /* колонка уже есть */ }
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN updated_at TEXT`);
  } catch { /* колонка уже есть */ }

  const oldRows = db
    .prepare(
      `SELECT id, phone, name, form, comment, subject, quiz, meta, created_at
       FROM leads WHERE phone_norm IS NULL`
    )
    .all();
  for (const r of oldRows) {
    const norm = normalizePhone(r.phone);
    if (!norm) { db.prepare('DELETE FROM leads WHERE id = ?').run(r.id); continue; }
    db.prepare(
      `UPDATE leads SET phone_norm = ?, updated_at = ? WHERE id = ?`
    ).run(norm, r.created_at, r.id);
    db.prepare(
      `INSERT INTO lead_messages (lead_id, form, subject, comment, quiz, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(r.id, r.form || 'unknown', r.subject, r.comment, r.quiz, r.meta, r.created_at);
  }
}

/* Нормализация телефона: только цифры, 8 -> 7, без +7 -> добавляем 7 */
export function normalizePhone(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d && !d.startsWith('7')) d = '7' + d;
  return d.length === 11 ? d : null;
}

/* ---------- Загрузка вложений (эскизы) ---------- */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'data', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* Белый список расширений (мим-тип проверяем дополнительно) */
const FILE_EXT_WHITELIST = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);
const MIME_WHITELIST = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
]);
const FILE_MAX_SIZE = 10 * 1024 * 1024; /* 10 МБ — общий лимит */
const IMG_MAX_SIZE = 5 * 1024 * 1024;  /* 5 МБ — отдельный лимит для фото */

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    /* Случайное имя файла: исключает перезапись и path traversal через имя */
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomBytes(16).toString('hex') + (FILE_EXT_WHITELIST.has(ext) ? ext : ''));
    },
  }),
  limits: { fileSize: FILE_MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = FILE_EXT_WHITELIST.has(ext);
    const mimeOk = MIME_WHITELIST.has(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    /* Подсовывать содержимое под чужим расширением не даём */
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), false);
  },
});

/* ---------- Приложение ---------- */
const app = express();
app.use(express.json());

/* Пока сайт в разработке — запрещаем индексацию всем роботам (заголовок действует и на PDF) */
app.use((_req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });

/* Папка сервера (база, вложения, исходники) не должна быть доступна публично */
app.use('/server', (_req, res) => res.status(404).end());
app.use(express.static(ROOT));

/* Простые сессии админки (в памяти — перезапуск сервера разлогинивает) */
const sessions = new Set();

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token && sessions.has(token)) return next();
  res.status(401).json({ error: 'unauthorized' });
}

/* ---------- API: создание заявки (с объединением по телефону) ---------- */
app.post('/api/leads', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      /* Ошибка multer: файл слишком большой или неразрешённый тип */
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'file_not_allowed',
        });
      }
      return res.status(400).json({ error: 'bad_request' });
    }

    /* Фото — не тяжелее 5 МБ (клиент их сжимает, это защита от обхода) */
    if (req.file) {
      const isImg = /^image\//.test(req.file.mimetype);
      if (isImg && req.file.size > IMG_MAX_SIZE) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'image_too_heavy' });
      }
    }

    const b = req.body || {};
    console.log(
      `[заявка] ${new Date().toLocaleTimeString('ru-RU')} форма=${b.form || '?'} ` +
      `тип=${req.headers['content-type'] || 'нет'} файл=${req.file ? req.file.originalname + ' (' + req.file.size + ' байт)' : 'нет'}`
    );
    const phone = String(b.phone || '').trim();
    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      /* Некорректная заявка: приложенный файл не оставляем */
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'invalid_phone' });
    }

    const meta = JSON.stringify({
      ip: req.ip,
      ua: req.headers['user-agent'],
      referer: req.headers.referer,
    });

    /* Ищем существующий контакт по нормализованному номеру */
    let lead = db.prepare('SELECT * FROM leads WHERE phone_norm = ?').get(phoneNorm);

    let merged = true;
    if (!lead) {
      merged = false;
      const info = db
        .prepare('INSERT INTO leads (phone, phone_norm, name, updated_at) VALUES (?, ?, ?, datetime(\'now\', \'localtime\'))')
        .run(phone.slice(0, 30), phoneNorm, b.name ? String(b.name).slice(0, 200) : null);
      lead = { id: info.lastInsertRowid, name: b.name ? String(b.name).slice(0, 200) : null };
    } else {
      /* Контакт существует: обновляем имя (если пришло непустое и новое) и дату обращения */
      const newName =
        b.name && String(b.name).trim() && String(b.name) !== lead.name
          ? String(b.name).slice(0, 200)
          : lead.name;
      db.prepare(
        `UPDATE leads SET name = ?, phone = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
      ).run(newName, phone.slice(0, 30), lead.id);
    }

    /* Каждое обращение — отдельная запись в истории */
    db.prepare(
      `INSERT INTO lead_messages (lead_id, form, subject, comment, quiz, attachment, attachment_name, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      lead.id,
      String(b.form || 'unknown').slice(0, 50),
      b.subject ? String(b.subject).slice(0, 300) : null,
      b.comment ? String(b.comment).slice(0, 2000) : null,
      b.quiz ? JSON.stringify(b.quiz) : (b.answers ? String(b.answers).slice(0, 2000) : null),
      req.file ? req.file.filename : null,
      req.file ? path.basename(req.file.originalname).slice(0, 200) : null,
      meta
    );

    res.status(merged ? 200 : 201).json({ ok: true, merged });
  });
});

/* ---------- API: скачивание вложения (только админ) ---------- */
app.get('/api/files/:messageId', requireAdmin, (req, res) => {
  const msg = db
    .prepare('SELECT attachment, attachment_name FROM lead_messages WHERE id = ?')
    .get(req.params.messageId);
  if (!msg || !msg.attachment || !/^[a-f0-9]{32}(\.\w+)?$/.test(msg.attachment)) {
    return res.status(404).json({ error: 'not_found' });
  }
  const filePath = path.join(UPLOAD_DIR, msg.attachment);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) return res.status(404).end();
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'not_found' });
  /* asAttachment + явное имя файла — не отдаём как HTML, XSS через вложение исключён */
  res.download(filePath, msg.attachment_name || 'attachment');
});

/* ---------- API: список контактов со всеми обращениями (только для админа) ---------- */
app.get('/api/leads', requireAdmin, (req, res) => {
  const leads = db
    .prepare(
      `SELECT l.id, l.phone, l.name, l.status, l.created_at, l.updated_at,
              COUNT(m.id) AS appeals
       FROM leads l LEFT JOIN lead_messages m ON m.lead_id = l.id
       GROUP BY l.id ORDER BY l.updated_at DESC, l.id DESC`
    )
    .all();

  const messages = db
    .prepare(
      `SELECT id, lead_id, form, subject, comment, quiz, attachment, attachment_name, meta, created_at
       FROM lead_messages ORDER BY id ASC`
    )
    .all();

  const parseJson = (s) => {
    if (!s) return null;
    try { return JSON.parse(s); } catch { return s; }
  };

  const byLead = new Map();
  for (const m of messages) {
    if (!byLead.has(m.lead_id)) byLead.set(m.lead_id, []);
    byLead.get(m.lead_id).push({ ...m, quiz: parseJson(m.quiz), meta: parseJson(m.meta) });
  }

  res.json(leads.map((l) => ({ ...l, messages: byLead.get(l.id) || [] })));
});

/* Отметить заявку обработанной / новой */
app.patch('/api/leads/:id', requireAdmin, (req, res) => {
  const status = req.body?.status === 'done' ? 'done' : 'new';
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

/* Удалить контакт (вся история удалится по каскаду) */
app.delete('/api/leads/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM lead_messages WHERE lead_id = ?').run(req.params.id);
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Вход в админку ---------- */
app.post('/api/admin/login', (req, res) => {
  if ((req.body?.password || '') !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'wrong_password' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.add(token);
  res.json({ token });
});

/* ---------- Админ-панель ---------- */
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Админ-панель:   http://localhost:${PORT}/admin`);
});
