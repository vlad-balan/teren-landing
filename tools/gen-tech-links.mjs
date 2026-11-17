/**
 * Блоки перелинковки на страницах технологий и фундаментов.
 * Вставляет перед </main> секцию карточек релевантных проектов
 * (+ перекрёстные ссылки для страниц фундаментов).
 * Запуск: node tools/gen-tech-links.mjs  (идемпотентно)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
globalThis.window = globalThis;
await import(pathToFileURL(path.join(ROOT, 'assets/js/projects-data.js')).href);
await import(pathToFileURL(path.join(ROOT, 'assets/js/projects-data-2.js')).href);
const DATA = globalThis.TEREM_PROJECTS;
const byId = Object.fromEntries(DATA.map(p => [p.id, p]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function card(p) {
  const area = (p.facts || []).find(f => /площад/i.test(f.label));
  const price = p.price
    ? `<p class="proj-card__price">${p.priceLabel || 'Строительство под ключ'}<b>${esc(p.price)}</b></p>`
    : '';
  return `<article class="proj-card reveal">
        <a class="proj-card__media proj-card__media--img" href="projects/${p.id}">
          <img src="${p.cover}" alt="${esc(p.shortTitle)}" loading="lazy">
        </a>
        <div class="proj-card__body">
          <div class="proj-card__tags">${(p.tags || []).slice(0, 2).map(t => `<span>${esc(t)}</span>`).join('')}</div>
          <h3>${esc(p.shortTitle)}</h3>
          <ul class="proj-card__specs">
            ${area ? `<li>${esc(area.value)} застройки</li>` : ''}
            <li>Полная рабочая документация</li>
          </ul>
          <div class="proj-card__foot">
            ${price}
            <a class="link-btn" href="projects/${p.id}">Смотреть проект <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>
          </div>
        </div>
      </article>`;
}

function projectsSection({ eyebrow, title, lead, ids }) {
  const items = ids.map(id => byId[id]).filter(Boolean);
  if (!items.length) return '';
  return `
<!-- ===================== ${eyebrow.toUpperCase()} (автогенерация) ===================== -->
<section class="section section--sand tech-projects">
  <div class="container">
    <header class="section__head">
      <p class="section__eyebrow">${eyebrow}</p>
      <h2 class="section__title">${title}</h2>
      ${lead ? `<p class="section__lead">${lead}</p>` : ''}
    </header>
    <div class="projects__grid">
${items.map(card).join('\n')}
    </div>
  </div>
</section>
`;
}

const BARBEKU = DATA.filter(p => p.type === 'Барбекю комплекс').map(p => p.id);
const BANI = DATA.filter(p => p.type === 'Баня' && p.price).map(p => p.id)
  .concat(DATA.filter(p => p.type === 'Баня' && !p.price).map(p => p.id));

const PAGES = {
  'karkas.html': {
    eyebrow: 'Примеры проектов', title: 'Каркасные дома и бани — наши проекты',
    lead: 'Каждый проект построен по технологии, описанной выше: с рабочей документацией, узлами и сметой.',
    ids: ['banya-novoe-selco-2', 'yuzhnoe-sudakovo', 'vait-village', 'tarychevo'],
  },
  'brus.html': {
    eyebrow: 'Примеры проектов', title: 'Проекты из клееного бруса',
    lead: 'Бани из клееного бруса 200×200 — с полной рабочей документацией и строительством под ключ.',
    ids: ['duhanino', 'mozhaisk'],
  },
  'gazoblok.html': {
    eyebrow: 'Примеры проектов', title: 'Проекты из газоблока',
    lead: 'Дома и бани из газоблока Исткульт — проекты с документацией и ценой строительства под ключ.',
    ids: ['stupino', 'pribrejniy'],
  },
  'keramoblok.html': {
    eyebrow: 'Примеры проектов', title: 'Проект из керамоблока',
    lead: 'Дом «Терра» 13,8×9,8 — керамоблок, фальцевая кровля, тёплый контур за 12 780 000 ₽.',
    ids: ['dom-keramoblok'],
  },
  'bani.html': {
    eyebrow: 'Наши проекты', title: 'Бани под ключ — 12 проектов с ценами',
    lead: 'Каждая баня построена по полному рабочему проекту: документация, смета и фиксированный срок в договоре.',
    ids: BANI,
  },
  'mangalnye-zony.html': {
    eyebrow: 'Готовые проекты', title: 'Барбекю-комплексы с документацией',
    lead: 'Девять реализованных комплексов — от угловой беседки до павильона летней кухни с панорамной топкой.',
    ids: BARBEKU,
  },
};

/* проекты по типу фундамента (для страниц фундаментов) */
const projectsWithFound = (re) => DATA.filter(p => {
  const f = (p.facts || []).find(x => /фундамент/i.test(x.label));
  return f && re.test(f.value);
}).map(p => p.id);

const FUND_PAGES = {
  'fundament-plita.html': {
    title: 'Проекты на монолитной плите',
    ids: projectsWithFound(/плит/i),
    cross: [['fundament-lenta', 'Ленточный фундамент'], ['fundament-svai', 'Свайный фундамент']],
  },
  'fundament-lenta.html': {
    title: 'Проекты на ленточном фундаменте',
    ids: projectsWithFound(/лент/i),
    cross: [['fundament-plita', 'Монолитная плита'], ['fundament-svai', 'Свайный фундамент']],
  },
  'fundament-svai.html': {
    title: 'Проекты на свайном фундаменте',
    ids: projectsWithFound(/свай|сваи/i),
    cross: [['fundament-plita', 'Монолитная плита'], ['fundament-lenta', 'Ленточный фундамент']],
  },
};

function insert(file, blockHtml) {
  const fp = path.join(ROOT, file);
  let html = fs.readFileSync(fp, 'utf8');
  /* идемпотентность: убираем прошлую автогенерацию (любой из блоков);
     \r? — файлы могут быть сохранены редактором с CRLF */
  html = html.replace(/\r?\n?<!-- =+ [^\n\r]*(АВТОГЕНЕРАЦИЯ|автогенерация)[^\n\r]*=+ -->\r?\n?<section[\s\S]*?<\/section>\r?\n?/g, '');
  if (!blockHtml) { fs.writeFileSync(fp, html, 'utf8'); return; }
  if (!html.includes('</main>')) { console.error('НЕТ </main>: ' + file); process.exitCode = 1; return; }
  html = html.replace('</main>', blockHtml + '\n</main>');
  fs.writeFileSync(fp, html, 'utf8');
  console.log('• ' + file);
}

for (const [file, cfg] of Object.entries(PAGES)) {
  insert(file, projectsSection(cfg));
}

for (const [file, cfg] of Object.entries(FUND_PAGES)) {
  const cards = cfg.ids.length ? projectsSection({
    eyebrow: 'Примеры проектов', title: cfg.title,
    lead: 'Проекты из нашего каталога, где применён этот вид фундамента.',
    ids: cfg.ids,
  }) : '';
  const cross = `
<!-- ===================== ДРУГИЕ ВИДЫ ФУНДАМЕНТА (автогенерация) ===================== -->
<section class="section tech-projects">
  <div class="container">
    <h2 class="section__title" style="font-size: clamp(22px, 3vw, 30px);">Другие виды фундаментов и технологии строительства</h2>
    <p style="margin: 12px 0 18px; line-height: 1.9;">
      ${cfg.cross.map(([href, text]) => `<a class="pd-crosslinks-link" href="${href}" style="color: var(--pine, #2f5d50); font-weight: 600; border-bottom: 1px solid rgba(47,93,80,.35); text-decoration: none; margin-right: 22px;">${text}</a>`).join('')}
      <a class="pd-crosslinks-link" href="karkas" style="color: var(--pine, #2f5d50); font-weight: 600; border-bottom: 1px solid rgba(47,93,80,.35); text-decoration: none; margin-right: 22px;">Каркасная технология</a>
      <a class="pd-crosslinks-link" href="projects" style="color: var(--pine, #2f5d50); font-weight: 600; border-bottom: 1px solid rgba(47,93,80,.35); text-decoration: none;">Все проекты</a>
    </p>
  </div>
</section>
`;
  insert(file, cards + cross);
}
console.log('Готово.');
