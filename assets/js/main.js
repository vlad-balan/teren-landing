/* ============================================================
   ТЕРЕМ — интерактив лендинга
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

  /* ---------- 9. Отправка заявок ----------
     ЗАМЕНЫТЕ sendLead() на реальный запрос к CRM / почтовому сервиссу:
     fetch('https://ваш-эндпоинт', { method:'POST', body: JSON.stringify(data) }) */
  function sendLead(data) {
    console.log('[Заявка] место интеграции с CRM:', data);
    return Promise.resolve();
  }

  function bindForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
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

        var payload = { form: form.dataset.form };
        form.querySelectorAll('input[name], select[name], textarea[name]').forEach(function (el) {
          if (el.type === 'checkbox') payload[el.name || 'consent'] = el.checked;
          else if (el.type !== 'hidden' || el.value) payload[el.name] = el.value;
        });

        var btn = form.querySelector('button[type=submit]');
        var btnText = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

        sendLead(payload).then(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnText; }
          form.reset();
          if (form.closest('.modal')) closeModal();
          openModal('modal-thanks');
        });
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
