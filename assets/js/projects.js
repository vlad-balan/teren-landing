/* ============================================================
   Рендер каталога проектов (projects.html) и страницы проекта
   (project.html). Данные — в projects-data.js.
   ============================================================ */
(function () {
  'use strict';
  var DATA = window.TEREM_PROJECTS || [];

  function sheetUrl(p, n) {
    return encodeURI(p.pdfBase + p.pdfPattern.replace('{n}', n));
  }

  /* ---------- Каталог ---------- */
  var catalogRoot = document.getElementById('projects-catalog');
  if (catalogRoot) {
    catalogRoot.innerHTML = DATA.map(function (p) {
      var tags = p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
      var fact = p.facts[0] ? p.facts[0].value : '';
    return (
      '<article class="proj-card reveal is-visible">' +
      '<a class="proj-card__media proj-card__media--img" href="projects/' + p.id + '.html">' +
      '<img src="' + p.cover + '" alt="' + p.shortTitle + '" loading="lazy">' +
      '<span class="badge badge--hit">Готовый проект</span></a>' +
      '<div class="proj-card__body">' +
      '<div class="proj-card__tags">' + tags + '</div>' +
      '<h3>' + p.shortTitle + '</h3>' +
      '<ul class="proj-card__specs"><li>' + p.facts.slice(0, 3).map(function (f) { return f.value; }).join(' · ') + '</li></ul>' +
      '<div class="proj-card__foot">' +
      '<p class="proj-card__price">Рабочая документация<b>' + p.facts[6].value + ' листов</b></p>' +
      '<a class="link-btn" href="projects/' + p.id + '.html">Смотреть проект <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
      '</div></div></article>'
    );
    }).join('');
  }

  /* ---------- Страница проекта ---------- */
  var root = document.getElementById('project-root');
  if (!root) return;

  var id = new URLSearchParams(location.search).get('id');
  var p = DATA.find(function (x) { return x.id === id; }) || DATA[0];
  if (!p) { root.innerHTML = '<p>Проект не найден.</p>'; return; }

  document.title = p.title + ' — проект | ТЕРЕМ';
  var crumb = document.querySelector('[data-p="crumb"]');
  if (crumb) crumb.textContent = p.shortTitle;

  /* Герой проекта */
  root.querySelector('[data-p="cover"]').src = p.cover;
  root.querySelector('[data-p="cover"]').alt = p.title;
  root.querySelector('[data-p="title"]').textContent = p.title;
  root.querySelector('[data-p="tags"]').innerHTML = p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
  root.querySelector('[data-p="desc"]').textContent = p.description;
  root.querySelector('[data-p="facts"]').innerHTML = p.facts.map(function (f) {
    return '<div class="pd-fact"><span>' + f.label + '</span><b>' + f.value + '</b></div>';
  }).join('');
  root.querySelector('[data-p="features"]').innerHTML = p.features.map(function (f) {
    return '<li><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' + f + '</li>';
  }).join('');

  /* Галерея: клик открывает соответствующий лист PDF */
  document.querySelector('[data-p="gallery"]').innerHTML = p.gallery.map(function (g) {
    return (
      '<a class="pgal__item" href="' + sheetUrl(p, g.sheet) + '" target="_blank" rel="noopener">' +
      '<img src="' + g.src + '" alt="' + g.caption + '" loading="lazy">' +
      '<span class="pgal__cap"><svg class="icon" aria-hidden="true"><use href="#i-doc"/></svg>' + g.caption + ' · лист ' + g.sheet + '</span></a>'
    );
  }).join('');

  /* Состав документации */
  document.querySelector('[data-p="docs"]').innerHTML = p.docs.map(function (g) {
    var items = g.sheets.map(function (s) {
      return '<li><a href="' + sheetUrl(p, s.n) + '" target="_blank" rel="noopener">' +
        '<b>Лист ' + s.n + '</b><span>' + s.t + '</span>' +
        '<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>';
    }).join('');
    return '<div class="pdocs__group"><h3>' + g.group + ' <i>' + g.sheets.length + '</i></h3><ul>' + items + '</ul></div>';
  }).join('');

  /* Полный PDF */
  var full = document.querySelector('[data-p="pdf-full"]');
  if (full) {
    full.href = encodeURI(p.pdfFull);
    full.querySelector('[data-p="pdf-size"]').textContent = p.pdfFullSize;
  }
})();
