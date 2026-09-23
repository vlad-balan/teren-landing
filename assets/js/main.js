/* ============================================================
   Династия Дерева — интерактив лендинга
   Зависимостей нет. Точка интеграции с CRM/бэкофисом — sendLead().
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. Год в футере ---------- */
  var $year = document.getElementById('year');
  if ($year) $year.textContent = new Date().getFullYear();

  /* ---------- 2. Мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function closeMenu() {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
  }

  /* На десктопе меню живёт в строке шапки, на мобиле — вне шапки:
     у шапки backdrop-filter, и fixed-элемент внутри неё позиционируется
     от полоски шапки, а не от окна (из-за этого меню «выглядывало» сверху). */
  var navDesktop = window.matchMedia('(min-width: 981px)');
  function placeNav() {
    if (!nav) return;
    if (navDesktop.matches) {
      var actions = document.querySelector('.header__actions');
      actions.parentNode.insertBefore(nav, actions);
      closeMenu();
    } else {
      document.body.insertBefore(nav, document.querySelector('main'));
    }
  }
  placeNav();
  if (navDesktop.addEventListener) navDesktop.addEventListener('change', placeNav);

  /* ---------- 3. Тень шапки при скролле ---------- */
  var header = document.getElementById('header');
  var onScroll = function () {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 4. Появление секций при скролле ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 5. Анимированные счётчики ---------- */
  var counters = document.querySelectorAll('.counter');
  function animateCounter(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var duration = 1400;
    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------- 6. FAQ: открытым остается один вопрос ---------- */
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  /* ---------- 7. Модальные окна ---------- */
  var activeModal = null;

  function openModal(id, subject) {
    var modal = document.getElementById(id);
    if (!modal) return;
    if (activeModal) closeModal();
    activeModal = modal;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (id === 'modal-callback' && subject) {
      var hidden = document.getElementById('callback-subject');
      var note = document.getElementById('callback-subject-note');
      if (hidden) hidden.value = subject;
      if (note) note.textContent = '«' + subject + '» — уточним детали и назовем ориентир по цене за 15 минут.';
    }
    var firstInput = modal.querySelector('input:not([type=hidden])');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 250);
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.classList.remove('is-open');
    activeModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    activeModal = null;
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal]');
    if (opener) {
      e.preventDefault();
      openModal(opener.dataset.modal, opener.dataset.subject || '');
      return;
    }
    if (e.target.closest('[data-close]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeModal();
      closeMenu();
    }
  });

  /* ---------- 8. Маска телефона +7 (XXX) XXX-XX-XX ---------- */
  document.querySelectorAll('input[type=tel]').forEach(function (input) {
    input.addEventListener('input', function () {
      var digits = input.value.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (digits && !digits.startsWith('7')) digits = '7' + digits;
      digits = digits.slice(0, 11);
      var out = '';
      if (digits.length) out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 7) out += '-' + digits.slice(7, 9);
      if (digits.length >= 9) out += '-' + digits.slice(9, 11);
      input.value = out;
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 (';
    });
    input.addEventListener('blur', function () {
      if (input.value.replace(/\D/g, '').length <= 1) input.value = '';
    });
  });

  /* ---------- 8a. Кастомные селекты (data-custom) ----------
     Нативный select остаётся в разметке скрытым — валидация и отправка
     формы работают как раньше, меняется только внешний вид списка. */
  function initCustomSelects() {
    document.querySelectorAll('select[data-custom]').forEach(function (sel) {
      if (sel.dataset.customized) return;
      sel.dataset.customized = '1';

      var wrap = document.createElement('div');
      wrap.className = 'cselect';
      sel.classList.add('cselect__native');
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);

      var options = Array.prototype.slice.call(sel.options);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cselect__btn';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');

      var list = document.createElement('ul');
      list.className = 'cselect__list';
      list.setAttribute('role', 'listbox');

      options.forEach(function (opt, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.className = 'cselect__option';
        li.textContent = opt.textContent;
        li.addEventListener('click', function () {
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          close();
        });
        list.appendChild(li);
      });

      function syncBtn() {
        var cur = sel.options[sel.selectedIndex];
        btn.innerHTML = '<span class="cselect__value">' + cur.textContent + '</span>' +
          '<svg class="icon cselect__chev" aria-hidden="true"><use href="#i-chevron"/></svg>';
      }
      function markSelected() {
        list.querySelectorAll('.cselect__option').forEach(function (li, i) {
          li.classList.toggle('is-selected', i === sel.selectedIndex);
          li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false');
        });
      }
      function open() {
        wrap.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        markSelected();
      }
      function close() {
        wrap.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }

      btn.addEventListener('click', function () {
        wrap.classList.contains('is-open') ? close() : open();
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          var d = e.key === 'ArrowDown' ? 1 : -1;
          var i = Math.min(options.length - 1, Math.max(0, sel.selectedIndex + d));
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          if (wrap.classList.contains('is-open')) markSelected();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          wrap.classList.contains('is-open') ? close() : open();
        }
      });
      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
          close();
          btn.focus();
        }
      });
      sel.addEventListener('change', syncBtn);

      syncBtn();
      wrap.appendChild(btn);
      wrap.appendChild(list);
    });
  }
  initCustomSelects();

  /* ---------- 8b. Табы (data-tabs): технологии строительства и пр. ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role=tab]'));
    function activate(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.setAttribute('tabindex', on ? '0' : '-1');
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.toggle('is-active', on);
          panel.hidden = !on;
        }
      });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); activate(next); next.focus(); }
      });
    });
    activate(tabs[0]);
  });

  /* ---------- 9. Отправка заявок на бэкенд (server/server.js) ---------- */
  function sendLead(data) {
    var opts = { method: 'POST' };
    if (data instanceof FormData) {
      opts.body = data; /* Content-Type выставит браузер (multipart/form-data) */
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(data);
    }
    return fetch('/api/leads', opts).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (e) {
          var msg = 'server error ' + res.status;
          if (e.error === 'file_too_large') msg = 'Файл больше 10 МБ';
          else if (e.error === 'image_too_heavy') msg = 'Фото слишком тяжёлое (больше 5 МБ)';
          else if (e.error === 'file_not_allowed') msg = 'Такой файл не поддерживается';
          throw new Error(msg);
        });
      }
    });
  }

  /* Загрузка эскиза: допустимые типы и максимальный размер (дублируется на сервере) */
  var FILE_MAX_SIZE = 10 * 1024 * 1024;
  var IMG_MAX_SIZE = 5 * 1024 * 1024; /* отдельный лимит для фото */
  var FILE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];

  function isImage(file) {
    return /^image\/(jpeg|png|webp|gif)$/.test(file.type);
  }

  /* Сжатие тяжёлых фото перед отправкой: длинная сторона до 2000px, JPEG q=0.85.
     Фото с телефона (3–8 МБ) превращаются в ~300–700 КБ — качества для эскиза достаточно. */
  function shrinkImage(file) {
    var MAX_SIDE = 2000;
    if (!isImage(file) || file.type === 'image/gif') return Promise.resolve(file);

    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        /* Мелкие и лёгкие картинки не трогаем */
        if (scale >= 1 && file.size <= 1.5 * 1024 * 1024) return resolve(file);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) return resolve(file); /* не сделали хуже — шлём оригинал */
          var out = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
          resolve(out);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function bindFileInputs() {
    document.querySelectorAll('input[type=file]').forEach(function (input) {
      var label = input.closest('.field').querySelector('.file-label');
      var text = label.querySelector('[data-file-text]');
      var defaultText = text.textContent;

      input.addEventListener('change', function () {
        label.classList.remove('is-error', 'is-loaded');
        var file = input.files && input.files[0];
        if (!file) { text.textContent = defaultText; return; }

        var ext = file.name.split('.').pop().toLowerCase();
        var typeOk = FILE_TYPES.indexOf(ext) !== -1 || /^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.type === 'application/pdf';
        var sizeLimit = isImage(file) ? IMG_MAX_SIZE : FILE_MAX_SIZE;
        if (!typeOk || file.size > sizeLimit) {
          input.value = '';
          label.classList.add('is-error');
          text.textContent = !typeOk
            ? 'Такой файл не поддерживается'
            : (isImage(file)
              ? 'Фото больше 5 МБ'
              : 'Файл больше 10 МБ');
          return;
        }
        label.classList.add('is-loaded');
        text.textContent = file.name.length > 40 ? file.name.slice(0, 37) + '…' : file.name;
      });
    });
  }
  bindFileInputs();

  function bindForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      /* Защита от повторного навешивания: квиз вызывает bindForms() заново
         на каждом рендере финального шага — без проверки каждая статичная
         форма получала второй submit-обработчик и заявка уходила дважды */
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var phone = form.querySelector('input[name=phone]');
        var consent = form.querySelector('.consent input');
        var valid = true;

        if (phone && phone.value.replace(/\D/g, '').length < 11) {
          phone.closest('.field').classList.add('is-error');
          phone.focus();
          valid = false;
        } else if (phone) {
          phone.closest('.field').classList.remove('is-error');
        }
        if (consent && !consent.checked) {
          consent.closest('.consent').style.color = '#BB4D38';
          valid = false;
        } else if (consent) {
          consent.closest('.consent').style.color = '';
        }
        if (!valid) return;

        var fileInput = form.querySelector('input[type=file]');
        var file = fileInput && fileInput.files && fileInput.files[0];

        var btn = form.querySelector('button[type=submit]');
        var btnText = btn ? btn.textContent : '';
        /* Блокируем кнопку сразу — на время сжатия фото и отправки (защита от двойного сабмита) */
        if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

        /* Тяжёлое фото сначала сжимаем, затем формируем payload */
        (file ? shrinkImage(file) : Promise.resolve(null)).then(function (prepared) {
        var payload;
        if (prepared) {
          payload = new FormData();
          payload.append('form', form.dataset.form);
          payload.append('file', prepared);
          form.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (el) {
            if (el.type === 'file') return; /* сам файл уже добавлен выше */
            if (el.type === 'checkbox') payload.append(el.name || 'consent', el.checked);
            else payload.append(el.name, el.value);
          });
        } else {
          payload = { form: form.dataset.form };
          form.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (el) {
            if (el.type === 'file') return;
            if (el.type === 'checkbox') payload[el.name || 'consent'] = el.checked;
            else if (el.type !== 'hidden' || el.value) payload[el.name] = el.value;
          });
        }

        sendLead(payload).then(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnText; }
          form.reset();
          var fi = form.querySelector('input[type=file]');
          if (fi) fi.dispatchEvent(new Event('change')); /* вернуть подпись поля загрузки */
          if (form.closest('.modal')) closeModal();
          openModal('modal-thanks');
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = btnText; }
          if (err && /^Файл|файл|Такой|Фото/.test(err.message)) alert(err.message);
          else alert('Не удалось отправить заявку. Позвоните нам, пожалуйста: +7 (900) 000-00-00');
        });
        }).catch(function () {
          /* страховка: если упало сжатие фото — возвращаем кнопку */
          if (btn) { btn.disabled = false; btn.textContent = btnText; }
          alert('Не удалось отправить заявку. Позвоните нам, пожалуйста: +7 (900) 000-00-00');
        }); /* конец shrinkImage().then */
      });
    });
  }
  bindForms();

  /* ---------- 10. Квиз ---------- */
  var QUIZ_STEPS = [
    {
      title: 'Что планируете строить?',
      sub: 'Можно выбрать комплекс — рассчитаем оба объекта со скидкой',
      options: ['Дом', 'Баню', 'Беседку', 'Мангальную зону', 'Навес', 'Гараж', 'Комплекс (дом + баня и т.п.)']
    },
    {
      title: 'Есть ли у вас проект?',
      sub: 'Если нет — подберем типовой или спроектируем бесплатно',
      options: ['Проект есть', 'Нужен типовой из каталога', 'Нужен индивидуальный', 'Пока не определился']
    },
    {
      title: 'Какой материал предпочитаете?',
      sub: 'Не уверены — подберем под бюджет и задачу после расчета',
      options: ['Каркас', 'Профилированный брус', 'Клееный брус', 'Кирпич / блоки', 'Посоветуйте']
    },
    {
      title: 'Какая площадь нужна?',
      sub: 'Ориентировочно — уточним на выезде инженера',
      options: ['До 30 м²', '30–60 м²', '60–100 м²', 'Больше 100 м²']
    },
    {
      title: 'Когда планируете начать стройку?',
      sub: 'Скидку 5% зафиксируем за вами на 14 дней в любом случае',
      options: ['В этом месяце', 'Через 1–3 месяца', 'Через 3+ месяца', 'Пока присматриваюсь']
    }
  ];

  var quizBox = document.getElementById('quiz-box');
  if (!quizBox) return;

  var quizBody = document.getElementById('quiz-body');
  var quizPrev = document.getElementById('quiz-prev');
  var quizNext = document.getElementById('quiz-next');
  var quizNow = document.getElementById('quiz-step-now');
  var quizTotal = document.getElementById('quiz-step-total');
  var progressFill = document.getElementById('quiz-progress-fill');
  var TOTAL = QUIZ_STEPS.length + 1; // + шаг с контактами
  var step = 0;
  var answers = [];

  quizTotal.textContent = TOTAL;

  function renderStep() {
    quizNow.textContent = step + 1;
    progressFill.style.width = ((step) / TOTAL * 100) + '%';

    if (step < QUIZ_STEPS.length) {
      var data = QUIZ_STEPS[step];
      var optsHtml = data.options.map(function (opt, i) {
        var checked = answers[step] === opt ? ' checked' : '';
        return '<label class="quiz-option">' +
          '<input type="radio" name="q' + step + '" value="' + opt + '"' + checked + '>' +
          '<span>' + opt + '</span></label>';
      }).join('');
      quizBody.innerHTML =
        '<div class="quiz-step">' +
        '<p class="quiz-step__title">' + data.title + '</p>' +
        '<p class="quiz-step__sub">' + data.sub + '</p>' +
        '<div class="quiz-options">' + optsHtml + '</div>' +
        '</div>';
      quizPrev.hidden = step === 0;
      quizNext.hidden = false;
      quizNext.disabled = !answers[step];
      quizNext.textContent = 'Далее';

      quizBody.querySelectorAll('input[type=radio]').forEach(function (r) {
        r.addEventListener('change', function () {
          answers[step] = r.value;
          quizNext.disabled = false;
        });
      });
    } else {
      /* Финальный шаг: контакты */
      progressFill.style.width = '100%';
      var labels = answers.slice(0, QUIZ_STEPS.length).join(' · ');
      quizBody.innerHTML =
        '<form class="quiz-final" data-form="quiz">' +
        '<p class="quiz-step__title">Куда отправить смету и скидку 5%?</p>' +
        '<p class="quiz-step__sub">Ваши ответы: ' + labels + '</p>' +
        '<input type="hidden" name="answers" value="' + labels + '">' +
        '<div class="field"><label for="quiz-name">Ваше имя</label>' +
        '<input type="text" id="quiz-name" name="name" placeholder="Как к вам обращаться" autocomplete="name"></div>' +
        '<div class="field"><label for="quiz-phone">Телефон <span aria-hidden="true">*</span></label>' +
        '<input type="tel" id="quiz-phone" name="phone" placeholder="+7 (___) ___-__-__" required autocomplete="tel"></div>' +
        '<button class="btn btn--terra btn--block" type="submit">Получить смету и скидку 5%</button>' +
        '<p class="quiz-final-note">Смета в 3 комплектациях придет в WhatsApp или Telegram в течение рабочего дня</p>' +
        '<label class="consent"><input type="checkbox" checked required>' +
        '<span>Согласен с <a href="#" data-modal="modal-privacy">политикой конфиденциальности</a></span></label>' +
        '</form>';
      quizPrev.hidden = false;
      quizNext.hidden = true;
      bindForms(); // подключить валидацию и отправку к новой форме
      attachMask(document.getElementById('quiz-phone'));
    }
  }

  function attachMask(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      var digits = input.value.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (digits && !digits.startsWith('7')) digits = '7' + digits;
      digits = digits.slice(0, 11);
      var out = '';
      if (digits.length) out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 7) out += '-' + digits.slice(7, 9);
      if (digits.length >= 9) out += '-' + digits.slice(9, 11);
      input.value = out;
    });
  }

  quizNext.addEventListener('click', function () {
    if (step < QUIZ_STEPS.length && answers[step]) {
      step++;
      renderStep();
    }
  });
  quizPrev.addEventListener('click', function () {
    if (step > 0) { step--; renderStep(); }
  });

  renderStep();
})();
