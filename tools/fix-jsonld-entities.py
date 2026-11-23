# -*- coding: utf-8 -*-
"""Убирает HTML-сущности (&nbsp;) из JSON-LD Article на страницах статей."""
import io
import re
import json

SLUGS = ["brus", "fundament-lenta", "fundament-plita", "fundament-svai",
         "gazoblok", "karkas", "keramoblok", "kombinirovannye-doma"]

for slug in SLUGS:
    p = slug + ".html"
    h = io.open(p, encoding="utf-8").read()
    m = re.search(r'(<script type="application/ld\+json">\s*\{.*?"@type": "Article".*?</script>)', h, re.S)
    if not m:
        # показать первый JSON-LD блок для отладки
        first = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
        print(slug, "НЕ НАЙДЕН; первый блок начинается:", repr(first.group(1)[:80]) if first else "нет блоков")
        continue
    block = m.group(1)
    inner = block[len('<script type="application/ld+json">'):-len("</script>")]
    d = json.loads(inner)
    clean = json.dumps(d, ensure_ascii=False, indent=2).replace("&nbsp;", " ")
    new_block = '<script type="application/ld+json">' + clean + "</script>"
    h = h[:m.start()] + new_block + h[m.end():]
    io.open(p, "w", encoding="utf-8", newline="\n").write(h)
    print(slug, "очищен:", d["headline"][:45])
