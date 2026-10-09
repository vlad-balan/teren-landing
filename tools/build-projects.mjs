/**
 * Сборка SEO-страниц проектов.
 *
 * Что делает:
 *  - projects/<id>.html — статическая страница каждого проекта
 *    (полный HTML без клиентского рендера, уникальные title/description,
 *    canonical, Open Graph, JSON-LD);
 *  - sitemap.xml со всеми страницами;
 *  - robots.txt (закрывает /server, ссылается на карту сайта).
 *
 * Запуск из корня проекта:
 *    node tools/build-projects.mjs [базовыйURL]
 * По умолчанию база http://localhost:3000.
 * При деплое перегенерируйте с реальным доменом:
 *    node tools/build-projects.mjs https://teren-stroy.ru
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/* Боевой домен по умолчанию; переопределить можно аргументом или BASE_URL */
const BASE = (process.argv[2] || process.env.BASE_URL || 'https://derevo-777.ru').replace(/\/+$/, '');

/* projects-data.js — браузерный скрипт (window.TEREM_PROJECTS=...),
   подсовываем глобальный window и читаем данные */
globalThis.window = globalThis;
await import(pathToFileURL(path.join(ROOT, 'assets/js/projects-data.js')).href);
const DATA = globalThis.TEREM_PROJECTS;

if (!DATA || !DATA.length) {
  console.error('Не найдены данные проектов в assets/js/projects-data.js');
  process.exit(1);
}

const tplPath = path.join(ROOT, 'projects.html');
let tpl = fs.readFileSync(tplPath, 'utf8');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function sheetUrl(p, n) {
  /* отдельные PDF на листы — прямая ссылка; единый PDF — якорь на страницу */
  if (p.pdfMode === 'single') return '/' + encodeURI(p.pdfFull) + '#page=' + n;
  return '/' + encodeURI(p.pdfBase + p.pdfPattern.replace('{n}', n));
}
function sheetLabel(p) {
  return p.pdfMode === 'single' ? 'Стр.' : 'Лист';
}
function fullUrl(p) {
  return '/' + encodeURI(p.pdfFull);
}

fs.mkdirSync(path.join(ROOT, 'projects'), { recursive: true });
const urls = [BASE + '/', BASE + '/projects'];

for (const p of DATA) {
  const main = `
<main>

<section class="page-hero">
  <div class="container">
    <nav class="breadcrumbs" aria-label="Хлебные крошки">
      <a href="../">Главная</a>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
      <a href="../projects">Каталог проектов</a>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
      <span>${esc(p.shortTitle)}</span>
    </nav>
  </div>
</section>

<section class="section" style="padding-top: clamp(28px, 4vw, 48px);" id="project-root">
  <div class="container">
    <div class="pd-hero">
      <div class="pd-cover">
        <img src="/${p.cover}" alt="${esc(p.title)} — визуализация">
      </div>
      <div class="pd-info">
        <div class="pd-tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        <h1>${esc(p.title)}</h1>
        <div class="pd-facts">${p.facts.map((f) => `<div class="pd-fact"><span>${esc(f.label)}</span><b>${esc(f.value)}</b></div>`).join('')}</div>
        ${p.price ? `<div class="pd-price-line">Строительство под ключ — <b>${esc(p.price)}</b></div>` : ''}
        <p class="pd-desc">${esc(p.description)}</p>
      </div>
    </div>
    <ul class="pd-features">${p.features.map((f) => `<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>${esc(f)}</li>`).join('')}</ul>
  </div>
</section>

<section class="section section--sand">
  <div class="container">
    <header class="section__head">
      <p class="section__eyebrow">Визуализации и чертежи</p>
      <h2 class="section__title">Кликните по листу, чтобы открыть его в&nbsp;PDF</h2>
    </header>
    <div class="pgal">
      ${p.gallery.map((g) => `
      <a class="pgal__item" href="${sheetUrl(p, g.sheet)}" target="_blank" rel="noopener">
        <img src="/${g.src}" alt="${esc(p.shortTitle)} — ${esc(g.caption)}" loading="lazy">
        <span class="pgal__cap"><svg class="icon" aria-hidden="true"><use href="#i-doc"/></svg>${esc(g.caption)} · ${sheetLabel(p).toLowerCase()} ${g.sheet}</span>
      </a>`).join('')}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="pd-full">
      <div>
        <b>Полный комплект документации</b>
        <span>один PDF со всеми ${p.facts[6] ? p.facts[6].value : ''} листами</span>
      </div>
      <a class="btn btn--yellow" href="${fullUrl(p)}" target="_blank" rel="noopener">Скачать PDF · ${esc(p.pdfFullSize)}</a>
    </div>
  </div>
</section>

<section class="section section--sand">
  <div class="container" style="text-align: center; max-width: 720px;">
    <h2 class="section__title">Хотите такой проект на своём участке?</h2>
    <p class="section__lead" style="margin-bottom: 26px;">Адаптируем под ваши размеры и задачи, рассчитаем смету и построим по этому проекту под ключ.</p>
    ${p.price ? `
    <div class="pd-price">
      <span>Строительство по этому проекту</span>
      <b>${esc(p.price)}</b>
    </div>
    <p class="pd-price-note">В расчёте учтены: ${esc(p.priceIncludes)}.</p>` : ''}
    <a class="btn btn--yellow" href="../#cta">Получить расчет по проекту</a>
  </div>
</section>

</main>`;

  const desc = p.description.slice(0, 155).trim() + '…';
  const canonical = `${BASE}/projects/${p.id}`;

  /* Ключевые слова: название, тип, теги, габариты + общие фразы (10–20 шт.) */
  const plural = { 'Дом': 'дома', 'Баня': 'бани', 'Беседка': 'беседки', 'Гараж': 'гаражи', 'Навес': 'навесы' };
  const gen = { 'Дом': 'дома', 'Баня': 'бани', 'Беседка': 'беседки', 'Гараж': 'гаража', 'Навес': 'навеса' };
  const acc = { 'Дом': 'дом', 'Баня': 'баню', 'Беседка': 'беседку', 'Гараж': 'гараж', 'Навес': 'навес' };
  const low = p.type.toLowerCase();
  const dims = (p.facts[0] && /габарит|площад/i.test(p.facts[0].label))
    ? p.facts[0].value.toLowerCase().replace(/\s*м$/, '').replace(/×/g, 'x')
    : null;
  const kw = [
    `${p.title.toLowerCase()} проект`,
    `проект ${plural[p.type] || low}`,
    `готовый проект ${plural[p.type] || low}`,
    `${plural[p.type] || low} под ключ`,
    `купить проект ${gen[p.type] || low}`,
    `${low} с документацией`,
    `рабочий проект ${gen[p.type] || low}`,
    p.shortTitle.toLowerCase(),
    `${p.shortTitle.toLowerCase()} чертежи`,
    `заказать ${acc[p.type] || low} под ключ`,
  ];
  p.tags.forEach(t => {
    const tl = t.toLowerCase();
    if (tl !== low) kw.push(`${low} ${tl}`);
  });
  if (dims) kw.push(`проект ${plural[p.type] || low} ${dims}`);
  const keywords = [...new Set(kw)].slice(0, 20).join(', ');

  const seoHead = `
  <link rel="canonical" href="${canonical}">
  <meta name="description" content="${esc(desc)}">
  <meta name="keywords" content="${esc(keywords)}">
  <meta property="og:title" content="${esc(p.title)} — проект с документацией">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${BASE}/${p.cover}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": ${JSON.stringify(p.title)},
    "description": ${JSON.stringify(p.description)},
    "image": "${BASE}/${p.cover}",
    "category": ${JSON.stringify(p.type)},${p.price ? `
    "offers": {
      "@type": "Offer",
      "price": "${p.price.replace(/\D/g, '')}",
      "priceCurrency": "RUB",
      "availability": "https://schema.org/InStock",
      "url": "${canonical}"
    },` : ''}
    "brand": { "@type": "Organization", "name": "Династия Дерева" }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": "${BASE}/" },
      { "@type": "ListItem", "position": 2, "name": "Каталог проектов", "item": "${BASE}/projects" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(p.shortTitle)} }
    ]
  }
  </script>`;

  let page = tpl;
  /* контент вместо шаблонного main + seo-голова */
  page = page.replace(/<main>[\s\S]*<\/main>/, main.trim());
  page = page.replace('<title>Каталог проектов — беседки, дома и бани | Династия Дерева</title>', `<title>${esc(p.shortTitle)} — чертежи и документация</title>`);
  /* шаблонные description, keywords, canonical и JSON-LD из projects.html не нужны — у проекта свои */
  page = page.replace(/<meta name="description" content="[^"]*">(\r?\n)?/, '');
  page = page.replace(/<meta name="keywords" content="[^"]*">(\r?\n)?/, '');
  page = page.replace(/<link rel="canonical" href="[^"]*">(\r?\n)?/, '');
  page = page.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '');
  page = page.replace('</head>', seoHead + '\n</head>');
  /* статику рендерит сборка — клиентские рендереры не нужны */
  page = page.replace('<script src="assets/js/projects-data.js"></script>', '');
  page = page.replace('<script src="assets/js/projects.js"></script>', '');
  /* страница лежит в /projects/ — пути делаем корневыми */
  page = page.replace(/href="assets\//g, 'href="/assets/');
  page = page.replace(/src="assets\//g, 'src="/assets/');
  page = page.replace(/href="index\.html/g, 'href="/index.html');
  page = page.replace(/href="projects\.html/g, 'href="/projects.html');
  /* …и переводим в красивые относительные (../, без .html): работают и
     в подпапке хостинга (GitHub Pages / Netlify), и в корне домена */
  page = page.replace(/(href)="\/index\.html(#[^"]*)?"/g, '$1="../$2"');
  page = page.replace(/(href)="\/projects\.html"/g, '$1="../projects"');
  page = page.replace(/(href|src)="\//g, '$1="../');

  fs.writeFileSync(path.join(ROOT, 'projects', `${p.id}.html`), page, 'utf8');
  urls.push(canonical);
  console.log('• projects/' + p.id + '.html');
}

/* ---------- статические страницы (технологии и пр.) ---------- */
const STATIC_PAGES = ['keramoblok.html', 'gazoblok.html', 'brus.html', 'kombinirovannye-doma.html', 'karkas.html'];
for (const sp of STATIC_PAGES) {
  if (fs.existsSync(path.join(ROOT, sp))) urls.push(BASE + '/' + sp);
}

/* ---------- sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
  <url><loc>${BASE}/projects</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
  <url><loc>${BASE}/privacy</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>
  <url><loc>${BASE}/terms</loc><lastmod>${today}</lastmod><priority>0.3</priority></url>
${urls.slice(2).map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
console.log('• sitemap.xml (' + urls.length + ' URL)');

/* ---------- robots.txt ---------- */
const robots = `User-agent: *
Disallow: /server/

Sitemap: ${BASE}/sitemap.xml
`;
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');
console.log('• robots.txt');
console.log('Готово. База: ' + BASE);
