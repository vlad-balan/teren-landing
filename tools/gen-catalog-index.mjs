/**
 * Вставка статического индекса всех проектов в каталог (projects.html).
 * Блок живёт внутри <main>, поэтому не попадает в генерируемые страницы проектов.
 * Запуск: node tools/gen-catalog-index.mjs
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

const GROUPS = [
  ['Дом', 'Дома'],
  ['Баня', 'Бани'],
  ['Беседка', 'Беседки'],
  ['Барбекю комплекс', 'Барбекю-комплексы'],
];

function meta(p) {
  const parts = [];
  const area = (p.facts || []).find(f => /площад/i.test(f.label));
  if (area) parts.push(area.value.replace(/\s+/g, ' ').trim());
  if (p.price) parts.push(`${p.price} — ${p.priceLabel || 'под ключ'}`);
  return parts.join(' · ');
}

const links = GROUPS.map(([type, label]) => {
  const items = DATA.filter(p => p.type === type);
  if (!items.length) return '';
  return `      <h3 class="catalog-index__title">${label}<span>${items.length}</span></h3>
      <ul class="catalog-index__list">
${items.map(p => `        <li><a href="projects/${p.id}">${p.shortTitle}</a>${meta(p) ? `<em>${meta(p)}</em>` : ''}</li>`).join('\n')}
      </ul>`;
}).filter(Boolean).join('\n');

const block = `
<!-- ===================== ПОЛНЫЙ СПИСОК ПРОЕКТОВ (статический индекс) ===================== -->
<section class="section catalog-index" id="catalog-index">
  <div class="container">
    <header class="section__head">
      <p class="section__eyebrow">Все проекты списком</p>
      <h2 class="section__title">Полный каталог с&nbsp;документацией</h2>
      <p class="section__lead">Дома, бани, беседки и барбекю-комплексы с полной рабочей документацией — от чертежей до строительства под ключ в Москве и Московской области.</p>
    </header>
${links}
  </div>
</section>

`;

const file = path.join(ROOT, 'projects.html');
let html = fs.readFileSync(file, 'utf8');
if (!html.includes('</main>')) { console.error('</main> не найден'); process.exit(1); }
/* убираем прошлый блок, если скрипт запускают повторно */
html = html.replace(/<!-- =+ ПОЛНЫЙ СПИСОК ПРОЕКТОВ[\s\S]*?<\/section>\n\n/, '');
/* блок в самом конце страницы — последняя секция перед </main> */
html = html.replace('</main>', block + '</main>');
html = html.replace('</main></main>', '</main>');
fs.writeFileSync(file, html, 'utf8');
console.log('Готово: статический индекс из ' + DATA.length + ' проектов вставлен в конец projects.html');
