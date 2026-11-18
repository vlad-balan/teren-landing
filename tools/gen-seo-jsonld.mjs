/**
 * SEO-разметка для ИИ-выдачи:
 *  1) FAQPage JSON-LD — из ВИДИМЫХ faq__item на странице (требование Google:
 *     разметка должна дублировать видимый контент). Заменяет существующие
 *     FAQPage-блоки, чтобы разметка не расходилась с текстом.
 *  2) LocalBusiness JSON-LD — на страницы, где его нет (эталон — блок с главной).
 * Идемпотентно: node tools/gen-seo-jsonld.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const LOCAL_BUSINESS = `{
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://derevo-777.ru/#org",
    "name": "Династия Дерева",
    "description": "Строительство домов, бань, беседок, мангальных зон, навесов и гаражей под ключ в Москве и Московской области.",
    "url": "https://derevo-777.ru/",
    "logo": "https://derevo-777.ru/assets/img/og-cover.jpg",
    "image": "https://derevo-777.ru/assets/img/og-cover.jpg",
    "telephone": "+7 (999) 888-75-70",
    "email": "Dinastiadereva@gmail.com",
    "priceRange": "₽₽₽",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Москва",
      "streetAddress": "17-й проезд Марьиной Рощи, д. 4, к. 1, этаж 6, офис 19",
      "addressCountry": "RU"
    },
    "areaServed": "Москва и Московская область",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      "opens": "09:00",
      "closes": "21:00"
    }
  }`;

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&laquo;': '«', '&raquo;': '»', '&mdash;': '—', '&ndash;': '–', '&times;': '×', '&deg;': '°', '&nbsp': ' ' };
const decode = (s) => s.replace(/&[a-z]+;?/gi, (e) => ENTITIES[e] ?? e);
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/* служебные — не трогаем; проектные страницы получает генератор build-projects */
const SKIP = new Set(['404.html', 'admin.html', 'logo-concepts.html', 'logo-concepts-2.html', 'project.html']);

const FAQ_ITEM_RE = /<details class="faq__item[^"]*"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g;
/* альтернативный формат FAQ (постоянно видимый): <p><b>Вопрос</b><br> Ответ</p> */
const FAQ_SEO_RE = /<p><b>([^<]+)<\/b><br>\s*([\s\S]*?)<\/p>/g;

let stats = { faq: 0, lb: 0 };
for (const file of fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP.has(f)).sort()) {
  const fp = path.join(ROOT, file);
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;

  /* --- 1. FAQPage --- */
  const items = [];
  for (const m of html.matchAll(FAQ_ITEM_RE)) {
    const q = stripTags(m[1]);
    const a = stripTags(m[2]);
    if (q && a) items.push({ q, a });
  }
  if (!items.length) {
    const seoBlock = html.match(/class="seo-faq"[^>]*>([\s\S]*?)<\/div>/);
    if (seoBlock) for (const m of seoBlock[1].matchAll(FAQ_SEO_RE)) {
      const q = stripTags(m[1]);
      const a = stripTags(m[2]);
      if (q && a) items.push({ q, a });
    }
  }
  /* убрать все существующие FAQPage-блоки (ручные и прошлую автогенерацию) */
  for (const b of html.matchAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g)) {
    if (b[0].includes('"FAQPage"')) html = html.replace(b[0], '');
  }
  html = html.replace(/[ \t]*<!-- FAQPage \(автогенерация\) -->\r?\n?/g, '');
  if (items.length) {
    const faqJson = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(({ q, a }) => ({
        '@type': 'Question', name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }, null, 2);
    const block = `  <!-- FAQPage (автогенерация) -->\n  <script type="application/ld+json">\n${faqJson}\n  </script>\n`;
    html = html.replace('</head>', block + '</head>');
    stats.faq++;
  }

  /* --- 2. LocalBusiness --- */
  if (!html.includes('"LocalBusiness"')) {
    const block = `  <!-- LocalBusiness (автогенерация) -->\n  <script type="application/ld+json">\n  ${LOCAL_BUSINESS}\n  </script>\n`;
    html = html.replace('</head>', block + '</head>');
    stats.lb++;
  }

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    console.log(`• ${file}: FAQPage${items.length ? ' (' + items.length + ' вопросов)' : ' —'}${html.includes('"LocalBusiness"') && !orig.includes('"LocalBusiness"') ? ' +LocalBusiness' : ''}`);
  } else {
    console.log(`• ${file}: без изменений`);
  }
}
console.log(`Готово: FAQPage на ${stats.faq} страницах, LocalBusiness добавлен на ${stats.lb}.`);
