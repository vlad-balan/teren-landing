<?php
declare(strict_types=1);
/**
 * Бэкенд заявок для Beget (PHP + SQLite) — порт server/server.js.
 *
 * Маршруты (через .htaccess, те же адреса, что и в Node-версии):
 *   POST /api/admin/login      -> ?act=login
 *   POST /api/leads            -> ?act=leads   (multipart или JSON)
 *   GET  /api/leads            -> ?act=leads   (только админ)
 *   PATCH|DELETE /api/leads/:id-> ?act=lead&id=ID
 *   GET  /api/files/:id        -> ?act=file&id=ID (только админ)
 *
 * Пароль админки: создайте рядом файл admin-config.php:
 *   <?php return 'ВАШ_ПАРОЛЬ';
 * Если файла нет, действует пароль по умолчанию — обязательно смените!
 */

session_start();

$ADMIN_PASSWORD = 'admin123';
if (is_file(__DIR__ . '/admin-config.php')) {
    $ADMIN_PASSWORD = (string)(require __DIR__ . '/admin-config.php');
}

$DB_FILE    = getenv('DB_FILE')    ?: __DIR__ . '/server/data/leads.db';
$UPLOAD_DIR = getenv('UPLOAD_DIR') ?: __DIR__ . '/server/data/uploads';

/* ---------- База (схема как в server/server.js) ---------- */
if (!is_dir(dirname($DB_FILE))) { mkdir(dirname($DB_FILE), 0775, true); }
if (!is_dir($UPLOAD_DIR))       { mkdir($UPLOAD_DIR, 0775, true); }

$pdo = new PDO('sqlite:' . $DB_FILE);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('PRAGMA journal_mode = WAL');

$pdo->exec("
  CREATE TABLE IF NOT EXISTS leads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    phone      TEXT    NOT NULL,
    phone_norm TEXT    NOT NULL UNIQUE,
    name       TEXT,
    status     TEXT    NOT NULL DEFAULT 'new',
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS lead_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    form       TEXT    NOT NULL,
    subject    TEXT,
    comment    TEXT,
    quiz       TEXT,
    attachment TEXT,
    attachment_name TEXT,
    meta       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
");
/* Миграция: колонки вложений/объединения для старых баз */
foreach ([
    ['leads', 'phone_norm', 'TEXT'], ['leads', 'updated_at', 'TEXT'],
    ['lead_messages', 'attachment', 'TEXT'], ['lead_messages', 'attachment_name', 'TEXT'],
] as [$tbl, $col, $type]) {
    $has = $pdo->prepare("PRAGMA table_info($tbl)");
    $has->execute();
    if (!in_array($col, array_column($has->fetchAll(), 'name'), true)) {
        $pdo->exec("ALTER TABLE $tbl ADD COLUMN $col $type");
    }
}

/* ---------- Помощники ---------- */
function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_phone(string $input): ?string {
    $d = preg_replace('/\D+/', '', $input) ?? '';
    if ($d !== '' && $d[0] === '8') { $d = '7' . substr($d, 1); }
    if ($d !== '' && $d[0] !== '7') { $d = '7' . $d; }
    return strlen($d) === 11 ? $d : null;
}

/* Тело запроса: JSON или обычная форма */
function body(): array {
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($ct, 'application/json') !== false) {
        $j = json_decode((string)file_get_contents('php://input'), true);
        return is_array($j) ? $j : [];
    }
    return $_POST;
}

function require_admin(): void {
    if (empty($_SESSION['admin'])) { json_out(['error' => 'unauthorized'], 401); }
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ($_GET['token'] ?? '');
    if (!is_string($token) || $token === '' || !hash_equals(session_id(), $token)) {
        json_out(['error' => 'unauthorized'], 401);
    }
}

/* ---------- Маршрут ---------- */
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$act    = $_GET['act'] ?? '';

/* --- Вход в админку --- */
if ($act === 'login') {
    if ($method !== 'POST') { json_out(['error' => 'method_not_allowed'], 405); }
    $b = body();
    if (!hash_equals($ADMIN_PASSWORD, (string)($b['password'] ?? ''))) {
        json_out(['error' => 'wrong_password'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    json_out(['token' => session_id()]);
}

/* --- Создание заявки (объединение по нормализованному телефону) --- */
if ($act === 'leads' && $method === 'POST') {
    /* Вложение: jpg/png/webp/gif/pdf, до 10 МБ, изображения — до 5 МБ */
    $file = $_FILES['file'] ?? null;
    $saved = null; $savedName = null;

    if ($file && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if (($file['size'] ?? 0) > 10 * 1024 * 1024) { json_out(['error' => 'file_too_large'], 400); }
        if ($file['error'] !== UPLOAD_ERR_OK)         { json_out(['error' => 'file_not_allowed'], 400); }
        $ext  = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        $fi   = new finfo(FILEINFO_MIME_TYPE);
        $mime = $fi->file($file['tmp_name']) ?: ($file['type'] ?? '');
        $extOk  = in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'], true);
        $mimeOk = in_array($mime, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'], true);
        if (!$extOk || !$mimeOk) { json_out(['error' => 'file_not_allowed'], 400); }
        if (str_starts_with($mime, 'image/') && ($file['size'] ?? 0) > 5 * 1024 * 1024) {
            json_out(['error' => 'image_too_heavy'], 400);
        }
        $saved    = bin2hex(random_bytes(16)) . '.' . $ext;
        $savedName = mb_substr((string)($file['name'] ?? 'attachment'), 0, 200);
        if (!move_uploaded_file($file['tmp_name'], $UPLOAD_DIR . '/' . $saved)) {
            $saved = null; $savedName = null;
        }
    }

    $b         = body();
    $phone     = trim((string)($b['phone'] ?? ''));
    $phoneNorm = normalize_phone($phone);
    if (!$phoneNorm) {
        if ($saved) { @unlink($UPLOAD_DIR . '/' . $saved); }
        json_out(['error' => 'invalid_phone'], 400);
    }

    $meta = json_encode([
        'ip'      => $_SERVER['REMOTE_ADDR'] ?? null,
        'ua'      => $_SERVER['HTTP_USER_AGENT'] ?? null,
        'referer' => $_SERVER['HTTP_REFERER'] ?? null,
    ], JSON_UNESCAPED_UNICODE);

    $st = $pdo->prepare('SELECT * FROM leads WHERE phone_norm = ?');
    $st->execute([$phoneNorm]);
    $lead = $st->fetch();

    $merged = true;
    $newName = ($b['name'] ?? null) !== null && trim((string)$b['name']) !== ''
        ? mb_substr((string)$b['name'], 0, 200) : null;

    if (!$lead) {
        $merged = false;
        $ins = $pdo->prepare("INSERT INTO leads (phone, phone_norm, name, updated_at) VALUES (?, ?, ?, datetime('now', 'localtime'))");
        $ins->execute([mb_substr($phone, 0, 30), $phoneNorm, $newName]);
        $lead = ['id' => (int)$pdo->lastInsertId()];
    } else {
        $newName = $newName !== null && $newName !== $lead['name'] ? $newName : $lead['name'];
        $upd = $pdo->prepare("UPDATE leads SET name = ?, phone = ?, updated_at = datetime('now', 'localtime') WHERE id = ?");
        $upd->execute([$newName, mb_substr($phone, 0, 30), $lead['id']]);
    }

    $quiz = isset($b['quiz']) ? json_encode($b['quiz'], JSON_UNESCAPED_UNICODE)
          : (isset($b['answers']) ? mb_substr((string)$b['answers'], 0, 2000) : null);

    $ins = $pdo->prepare(
        "INSERT INTO lead_messages (lead_id, form, subject, comment, quiz, attachment, attachment_name, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $ins->execute([
        $lead['id'],
        mb_substr((string)($b['form'] ?? 'unknown'), 0, 50),
        isset($b['subject']) ? mb_substr((string)$b['subject'], 0, 300) : null,
        isset($b['comment']) ? mb_substr((string)$b['comment'], 0, 2000) : null,
        $quiz,
        $saved, $savedName, $meta,
    ]);

    json_out(['ok' => true, 'merged' => $merged], $merged ? 200 : 201);
}

/* Всё дальше — только для админа */
require_admin();

/* --- Список контактов со всеми обращениями --- */
if ($act === 'leads' && $method === 'GET') {
    $leads = $pdo->query(
        "SELECT l.id, l.phone, l.name, l.status, l.created_at, l.updated_at,
                COUNT(m.id) AS appeals
         FROM leads l LEFT JOIN lead_messages m ON m.lead_id = l.id
         GROUP BY l.id ORDER BY l.updated_at DESC, l.id DESC"
    )->fetchAll();

    $messages = $pdo->query(
        "SELECT id, lead_id, form, subject, comment, quiz, attachment, attachment_name, meta, created_at
         FROM lead_messages ORDER BY id ASC"
    )->fetchAll();

    $byLead = [];
    foreach ($messages as $m) {
        foreach (['quiz', 'meta'] as $k) {
            $m[$k] = $m[$k] !== null ? (json_decode($m[$k], true) ?? $m[$k]) : null;
        }
        $byLead[$m['lead_id']][] = $m;
    }
    foreach ($leads as &$l) { $l['messages'] = $byLead[$l['id']] ?? []; }
    unset($l);
    json_out($leads);
}

/* --- Статус заявки --- */
if ($act === 'lead' && $method === 'PATCH') {
    $id   = (int)($_GET['id'] ?? 0);
    $b    = body();
    $status = ($b['status'] ?? '') === 'done' ? 'done' : 'new';
    $pdo->prepare('UPDATE leads SET status = ? WHERE id = ?')->execute([$status, $id]);
    json_out(['ok' => true]);
}

/* --- Удаление контакта --- */
if ($act === 'lead' && $method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    $pdo->prepare('DELETE FROM lead_messages WHERE lead_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    json_out(['ok' => true]);
}

/* --- Скачивание вложения --- */
if ($act === 'file' && $method === 'GET') {
    $id  = (int)($_GET['id'] ?? 0);
    $st  = $pdo->prepare('SELECT attachment, attachment_name FROM lead_messages WHERE id = ?');
    $st->execute([$id]);
    $msg = $st->fetch();
    if (!$msg || !$msg['attachment'] || !preg_match('/^[a-f0-9]{32}(\.\w+)?$/', $msg['attachment'])) {
        json_out(['error' => 'not_found'], 404);
    }
    $real = realpath($UPLOAD_DIR . '/' . $msg['attachment']);
    if (!$real || !str_starts_with($real, realpath($UPLOAD_DIR) . DIRECTORY_SEPARATOR) || !is_file($real)) {
        json_out(['error' => 'not_found'], 404);
    }
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . addslashes($msg['attachment_name'] ?: 'attachment') . '"');
    header('Content-Length: ' . filesize($real));
    readfile($real);
    exit;
}

json_out(['error' => 'not_found'], 404);
