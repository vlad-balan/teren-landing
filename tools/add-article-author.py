# -*- coding: utf-8 -*-
"""
Авторство статей для SEO (Яндекс «Качество сайта» / Google E-E-A-T):
  - meta name="author" + article:published_time / article:modified_time;
  - JSON-LD типа Article с автором-Person и издателем-Organizations
    (на страницах с CollectionPage блок заменяется на Article);
  - видимый блок автора в конце статьи (перед CTA-полосой);
  - дублирующий </main> убирается;
  - кэш-бамп style.css v36 -> v37.
Запуск: python tools/add-article-author.py
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AUTHOR_NAME = "Владислав Балан"
AUTHOR_JOB = "инженер-технолог"
AUTHOR_BIO = ("Инженер-технолог, один из ведущих специалистов «Династии Дерева». "
              "Опыт работы в области строительства и производства более 11 лет.")
PUBLISHER = "Династия Дерева"
OG_IMAGE = "https://derevo-777.ru/assets/img/og-cover.jpg"

# дата публикации (ноябрь 2026) и дата последней правки (из git)
DATES = {
    "keramoblok":            ("2026-11-05", "2026-11-22"),
    "gazoblok":              ("2026-11-06", "2026-11-22"),
    "brus":                  ("2026-11-10", "2026-11-22"),
    "karkas":                ("2026-11-12", "2026-11-22"),
    "kombinirovannye-doma":  ("2026-11-14", "2026-11-21"),
    "fundament-plita":       ("2026-11-17", "2026-11-22"),
    "fundament-lenta":       ("2026-11-19", "2026-11-22"),
    "fundament-svai":        ("2026-11-21", "2026-11-22"),
}

AUTHOR_SECTION = f'''
<section class="section" style="padding: 0 0 clamp(40px, 5vw, 64px);">
  <div class="container">
    <div class="article-author">
      <div class="article-author__avatar" aria-hidden="true">ВБ</div>
      <div>
        <p class="article-author__name">{AUTHOR_NAME}</p>
        <p class="article-author__bio">{AUTHOR_BIO}</p>
      </div>
    </div>
  </div>
</section>
'''.strip()


def article_jsonld(url, headline, description, published, modified):
    data = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline,
        "description": description,
        "image": OG_IMAGE,
        "author": {
            "@type": "Person",
            "name": AUTHOR_NAME,
            "jobTitle": AUTHOR_JOB,
            "description": "Опыт работы в области строительства и производства более 11 лет",
            "worksFor": {"@type": "Organization", "name": PUBLISHER},
        },
        "publisher": {
            "@type": "Organization",
            "name": PUBLISHER,
            "logo": {"@type": "ImageObject", "url": OG_IMAGE},
        },
        "datePublished": published + "T10:00:00+03:00",
        "dateModified": modified + "T10:00:00+03:00",
        "mainEntityOfPage": url,
        "inLanguage": "ru-RU",
    }
    return ('<script type="application/ld+json">\n'
            + json.dumps(data, ensure_ascii=False, indent=2)
            + "\n</script>")


def process(slug):
    path = os.path.join(ROOT, slug + ".html")
    html = io.open(path, encoding="utf-8").read()
    changed = []

    # 1. Дублирующий </main>
    if html.count("</main>") > 1:
        assert html.count("</main></main>") == 1, slug + ": неожиданный формат дублирования </main>"
        html = html.replace("</main></main>", "</main>")
        changed.append("дубль </main> убран")

    # 2. Данные страницы
    m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    assert m, slug + ": нет H1"
    headline = re.sub(r"<[^>]+>", "", m.group(1)).strip()
    m = re.search(r'<meta name="description" content="([^"]*)"', html)
    assert m, slug + ": нет meta description"
    description = m.group(1)
    m = re.search(r'<link rel="canonical" href="([^"]*)"', html)
    assert m, slug + ": нет canonical"
    url = m.group(1)
    published, modified = DATES[slug]

    # 3. Мета-теги автора и дат — после meta description
    metas = (
        f'  <meta name="author" content="{AUTHOR_NAME}">\n'
        f'  <meta property="article:published_time" content="{published}T10:00:00+03:00">\n'
        f'  <meta property="article:modified_time" content="{modified}T10:00:00+03:00">'
    )
    assert 'name="author"' not in html, slug + ": author уже есть"
    descr_line = re.search(r'^\s*<meta name="description" content="[^"]*">\s*$', html, re.M)
    assert descr_line, slug + ": не найдена строка meta description"
    html = html[:descr_line.end()] + "\n" + metas + html[descr_line.end():]
    changed.append("meta author + даты")

    # 4. JSON-LD Article: заменяем CollectionPage или вставляем новым блоком
    article_block = article_jsonld(url, headline, description, published, modified)
    cp = re.search(
        r'<script type="application/ld\+json">\s*\{(?:(?!</script>).)*?"@type":\s*"CollectionPage"(?:(?!</script>).)*?</script>',
        html, re.S)
    if cp:
        html = html[:cp.start()] + article_block + html[cp.end():]
        changed.append("CollectionPage -> Article")
    else:
        html = html[:descr_line.end()] + "\n" + article_block + html[descr_line.end():]
        changed.append("Article добавлен")

    # 5. Видимый блок автора — перед CTA-полосой (единственный pd-full)
    assert html.count("pd-full") == 1, slug + ": ждали 1 pd-full, нашли " + str(html.count("pd-full"))
    pd_idx = html.index("pd-full")
    sec_idx = html.rfind("<section", 0, pd_idx)
    assert sec_idx != -1, slug + ": не нашли <section> перед CTA"
    html = html[:sec_idx] + AUTHOR_SECTION + "\n\n" + html[sec_idx:]
    changed.append("блок автора")

    # 6. Кэш-бамп стилей
    assert "style.css?v=36" in html, slug + ": нет style.css?v=36"
    html = html.replace("style.css?v=36", "style.css?v=37", 1)

    io.open(path, "w", encoding="utf-8", newline="\n").write(html)
    print(slug + ".html: " + "; ".join(changed))


for slug in DATES:
    process(slug)

print("\nГотово: 8 страниц.")
