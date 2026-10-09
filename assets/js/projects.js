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

  /* ---------- Каталог: группы по типам (дома, бани, беседки, гаражи, навесы).
     Пустые категории не выводятся. ---------- */
  var catalogRoot = document.getElementById('projects-catalog');
  if (catalogRoot) {
    var order = ['Дом', 'Баня', 'Беседка', 'Гараж', 'Навес'];
    var labels = { 'Дом': 'Дома', 'Баня': 'Бани', 'Беседка': 'Беседки', 'Гараж': 'Гаражи', 'Навес': 'Навесы' };
    /* типы, которых нет в списке, не теряем — выводим в конце как есть */
    DATA.forEach(function (p) {
      if (order.indexOf(p.type) < 0) order.push(p.type);
    });

    function card(p) {
      var tags = p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
      return (
        '<article class="proj-card reveal is-visible">' +
        '<a class="proj-card__media proj-card__media--img" href="projects/' + p.id + '">' +
        '<img src="' + p.cover + '" alt="' + p.shortTitle + '" loading="lazy"></a>' +
        '<div class="proj-card__body">' +
        '<div class="proj-card__tags">' + tags + '</div>' +
        '<h3>' + p.shortTitle + '</h3>' +
        '<ul class="proj-card__specs"><li>' + p.facts.slice(0, 3).map(function (f) { return f.value; }).join(' · ') + '</li></ul>' +
        '<div class="proj-card__foot">' +
        '<p class="proj-card__price">' + (p.price ? 'Строительство под ключ<b>' + p.price + '</b>' : 'Рабочая документация<b>' + p.facts[6].value + ' листов</b>') + '</p>' +
        '<a class="link-btn" href="projects/' + p.id + '">Смотреть проект <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
        '</div></div></article>'
      );
    }

    catalogRoot.innerHTML = order.map(function (type) {
      var items = DATA.filter(function (p) { return p.type === type; });
      if (!items.length) return '';
      var label = labels[type] || type;
      return '<section class="cat-group">' +
        '<h2 class="cat-group__title">' + label + '</h2>' +
        '<div class="projects__grid">' + items.map(card).join('') + '</div>' +
        '</section>';
    }).join('');
  }

  /* ---------- Страница проекта ---------- */
  var root = document.getElementById('project-root');
  if (!root) return;

  var id = new URLSearchParams(location.search).get('id');
  var p = DATA.find(function (x) { return x.id === id; }) || DATA[0];
  if (!p) { root.innerHTML = '<p>Проект не найден.</p>'; return; }

  document.title = p.title + ' — проект | Династия Дерева';
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
