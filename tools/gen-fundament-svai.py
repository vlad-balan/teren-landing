# -*- coding: utf-8 -*-
"""Генератор fundament-svai.html из шаблона projects.html + контроль объёма статьи."""
import os, re

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open('projects.html', encoding='utf-8').read()

title_old = '<title>Каталог проектов — беседки, дома и бани | Династия Дерева</title>'
title_new = '<title>Свайный фундамент для дома под ключ в Москве и МО — цена, этапы | Династия Дерева</title>'
desc_start = src.index('<meta name="description"')
desc_old = src[desc_start:src.index('>', desc_start) + 1]
desc_new = ('<meta name="description" content="Свайный и свайно-ростверковый фундамент под ключ в Москве и МО: '
            'расчёт свайного фундамента, закручивание винтовых свай за 1–2 дня, любые грунты — торф, глина, уклон. '
            'Свайный фундамент для дома, бани и беседки. Фиксированная цена в договоре.">')

MEDIA = '<img src="assets/img/foundations/svai-hero.webp" alt="Свайный фундамент — винтовые сваи под домом" loading="lazy">'

main_start = src.index('<main>')
main_end = src.index('</main>') + len('</main>')

main_new = """<main class="tech-page">

<section class="page-hero">
  <div class="container">
    <nav class="breadcrumbs" aria-label="Хлебные крошки">
      <a href="index.html">Главная</a>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
      <a href="index.html#foundations">Фундаменты</a>
      <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
      <span>Свайный фундамент</span>
    </nav>
    <h1 class="section__title">Свайный фундамент для&nbsp;дома — тёплое основание на&nbsp;любых грунтах</h1>
    <p class="section__lead">Винтовые сваи Ø108 мм с бетонированием ствола и связкой ростверком. Строим на торфе, глине, уклонах и над водой — там, где лента и плита не работают.</p>
  </div>
</section>

<section class="section" style="padding-top: clamp(28px, 4vw, 48px);">
  <div class="container pd-hero">
    <div class="tech__side">
      <div class="tech__media">
        __HERO__
      </div>
      <aside class="tech__facts">
        <div><span>Срок монтажа</span><b>1–3 дня</b></div>
        <div><span>Грунты</span><b>любые, включая торф</b></div>
        <div><span>Строительный сезон</span><b>круглый год</b></div>
        <div><span>Ресурс</span><b>70–100 лет</b></div>
      </aside>
    </div>
    <div class="pd-info">
      <div class="pd-tags"><span>Винтовые сваи Ø108</span><span>Ствол с бетоном</span><span>Для сложных грунтов</span></div>
      <h2 style="font-family: var(--font-display); font-weight: 600; font-size: clamp(22px, 2.6vw, 30px); line-height: 1.25; color: var(--pine-900); margin: 14px 0 16px;">Что такое свайный и свайно-ростверковый фундамент</h2>
      <div class="pd-facts">
        <div class="pd-fact"><span>Свая</span><b>стальная труба Ø108 мм</b></div>
        <div class="pd-fact"><span>Длина сваи</span><b>1,8–3 м до плотного слоя</b></div>
        <div class="pd-fact"><span>Несущая способность</span><b>4–6 тонн на сваю</b></div>
        <div class="pd-fact"><span>Обвязка</span><b>брус 200×200 или ростверк</b></div>
      </div>
      <p class="pd-desc">Свайный фундамент — это стальные винтовые сваи, которые закручиваются в грунт без земляных работ. Лопасти уплотняют грунт по мере погружения, и свая держится в земле как анкер: её не выдавит морозным пучением. Сверху сваи обрезаются в уровень, стволы бетонируются и связываются обвязкой. Когда на сваях стоит каменный дом, поверх заливают монолитный ростверк — такой свайно-ростверковый фундамент держит тяжёлые стены не хуже ленты.</p>
    </div>
  </div>
</section>

<section class="section section--sand">
  <div class="container">
    <header class="section__head">
      <p class="section__eyebrow">Преимущества</p>
      <h2 class="section__title">Почему свайно-винтовой фундамент выбирают всё чаще</h2>
    </header>
    <ol class="advantages__grid">
      <li class="adv-card"><span class="adv-card__num">01</span><h3>Любые грунты и рельеф</h3><p>Торф, глина, водонасыщенная почва, уклон участка — сваи закручиваются до плотного слоя в любом месте.</p></li>
      <li class="adv-card"><span class="adv-card__num">02</span><h3>Монтаж за 1–3 дня</h3><p>Без котлована, земляных работ и вывоза грунта: участок остаётся чистым, а дом не теряет месяц на фундамент.</p></li>
      <li class="adv-card"><span class="adv-card__num">03</span><h3>Экономия против плиты и ленты</h3><p>Свайный фундамент для дома из лёгких материалов дешевле каменных оснований на 40–60%.</p></li>
      <li class="adv-card"><span class="adv-card__num">04</span><h3>Стройка в любой сезон</h3><p>Закручивание сваи зимой — обычное дело: мёрзлый грунт свае не помеха, техника работает при любом морозе.</p></li>
      <li class="adv-card"><span class="adv-card__num">05</span><h3>Без усадки — отделка сразу</h3><p>Дом можно собирать на следующий день после монтажа фундамента: металлу не нужно набирать прочность.</p></li>
      <li class="adv-card"><span class="adv-card__num">06</span><h3>Чистый участок</h3><p>Без котлована, кучи грунта и грязи: трава и деревья остаются как были — важно, если участок уже благоустроен.</p></li>
    </ol>
    <p style="margin-top: 22px; font-size: 15.5px; line-height: 1.65; color: var(--ink);">Расчёт свайного фундамента — это длина и диаметр свай под вес дома и тип грунта. Мы считаем несущую способность по данным геологии или пробного закручивания: одна свая Ø108 держит 4–6 тонн, шаг — 1,5–2,5 метра. Каждый ствол бетонируется изнутри и обрабатывается антикоррозийным составом — ресурс 70–100 лет.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <header class="section__head">
      <p class="section__eyebrow">Как мы строим</p>
      <h2 class="section__title">Расчёт свайного фундамента и&nbsp;этапы монтажа под&nbsp;ключ</h2>
    </header>
    <ol class="stages__grid">
      <li class="stage"><span class="stage__icon"><svg aria-hidden="true"><use href="#i-doc"/></svg></span><p class="stage__step">Этап 1</p><h3>Расчёт свайного фундамента</h3><p>Считаем вес дома, несущую способность и длину свай по геологии участка. Расчёт делаем бесплатно, шаг свай — 1,5–2,5 метра.</p></li>
      <li class="stage"><span class="stage__icon"><svg aria-hidden="true"><use href="#i-map"/></svg></span><p class="stage__step">Этап 2</p><h3>Разметка свайного поля</h3><p>Выносим оси дома на участок: каждая свая — по проекту, с точностью до сантиметра. Отклонения проверяем нивелиром.</p></li>
      <li class="stage"><span class="stage__icon"><svg aria-hidden="true"><use href="#i-helmet"/></svg></span><p class="stage__step">Этап 3</p><h3>Закручивание винтовых свай</h3><p>Свайно-винтовой фундамент собирается за 1–2 дня: сваи закручиваются до плотного слоя на глубину 1,8–3 метра.</p></li>
      <li class="stage"><span class="stage__icon"><svg aria-hidden="true"><use href="#i-ruler"/></svg></span><p class="stage__step">Этап 4</p><h3>Обрезка и бетонирование</h3><p>Сваи обрезаем в уровень, стволы армируем и бетонируем изнутри, сверху — оголовки под обвязку.</p></li>
      <li class="stage"><span class="stage__icon"><svg aria-hidden="true"><use href="#i-wallet"/></svg></span><p class="stage__step">Этап 5</p><h3>Обвязка или ростверк</h3><p>Под каркас и брус — обвязка брусом 200×200, под каменные стены — монолитный ростверк по сваям.</p></li>
      <li class="stage"><span class="stage__icon"><svg aria-hidden="true"><use href="#i-keyhand"/></svg></span><p class="stage__step">Этап 6</p><h3>Сдача с гарантией</h3><p>Акт, паспорт фундамента, гарантия 5 лет по договору. Основание готово к стройке в тот же день.</p></li>
    </ol>
    <div class="projects__more">
      <p><b>Важно понимать:</b> ресурс свайного фундамента решают три вещи — стенка трубы от 4 мм, бетонирование ствола изнутри и качественное антикоррозийное покрытие. Экономия на любом пункте сокращает срок службы вдвое. Все требования прописываем в проекте и смете.</p>
      <a class="btn btn--pine" href="index.html#cta">Рассчитать фундамент под проект</a>
    </div>
  </div>
</section>

<section class="section section--sand">
  <div class="container">
    <header class="section__head">
      <p class="section__eyebrow">Вопросы и ответы</p>
      <h2 class="section__title">Частые вопросы о свайном фундаменте</h2>
    </header>
    <div class="faq__list">
      <details class="faq__item"><summary>Подойдёт ли свайный фундамент для дома из газоблока?<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg></summary><p>Да — в связке с монолитным ростверком. Свайно-ростверковый фундамент держит стены из газоблока и керамоблока: ростверк распределяет вес дома по всем сваям. Для тяжёлых кирпичных домов считаем отдельно по геологии.</p></details>
      <details class="faq__item"><summary>Как долго служат винтовые сваи?<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg></summary><p>70–100 лет при толщине стенки от 4 мм, бетонировании ствола и качественном покрытии. Экономия на толщине и обработке сокращает ресурс вдвое — поэтому мы не используем сваи тоньше 4 мм.</p></details>
      <details class="faq__item"><summary>Можно ли закручивать сваи зимой?<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg></summary><p>Да, техника работает при любом морозе: мёрзлый грунт свае не помеха. Зимой грунтовые воды стоят ниже, и монтаж проходит даже чище, чем летом.</p></details>
      <details class="faq__item"><summary>Сколько стоит свайный фундамент под ключ?<svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg></summary><p>Цена зависит от количества, длины свай и типа обвязки. Расчёт свайного фундамента делаем бесплатно по данным участка, итоговая стоимость фиксируется в договоре.</p></details>
    </div>
  </div>
</section>

<section class="section section--sand">
  <div class="container pd-full" style="background: var(--pine);">
    <div>
      <b>Закрутим сваи и построим дом на сложном участке</b>
      <span>расчёт свайного фундамента бесплатно, фиксированная цена в договоре, гарантия 5 лет</span>
    </div>
    <a class="btn btn--terra" href="index.html#cta">Получить расчет <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>
  </div>
</section>

</main>"""

page = src[:main_start] + main_new + src[main_end:]
page = page.replace(title_old, title_new).replace(desc_old, desc_new)
page = page.replace('<script src="assets/js/projects-data.js"></script>', '')
page = page.replace('<script src="assets/js/projects.js"></script>', '')
page = page.replace('<main>', '<main class="tech-page">', 1)
page = page.replace('__HERO__', MEDIA)
page = re.sub(r'style\.css\?v=\d+', 'style.css?v=' + re.search(r'style\.css\?v=(\d+)', open('index.html', encoding='utf-8').read()).group(1), page)
open('fundament-svai.html', 'w', encoding='utf-8', newline='\n').write(page)

# объём статьи: описание + абзац + карточки + этапы + FAQ
article = ''
for m in re.findall(r'<p class="pd-desc">(.*?)</p>', page, re.S):
    article += m
article += re.search(r'Расчёт свайного фундамента — это длина.*?(?=</p>)', page, re.S).group(0)
for m in re.findall(r'<li class="adv-card">(.*?)</li>', page, re.S):
    article += m
for m in re.findall(r'<li class="stage">(.*?)</li>', page, re.S):
    article += m
for m in re.findall(r'<details class="faq__item">(.*?)</details>', page, re.S):
    article += m
text = re.sub(r'<[^>]+>', ' ', article)
print('символов статьи (без тегов):', len(re.sub(r'\s+', ' ', text).strip()))
