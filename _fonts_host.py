import io, os, re, urllib.request

CSS_URL = ('https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800;900'
           '&family=Lora:wght@500;600&display=swap')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')  # чтобы получить woff2

os.makedirs('assets/fonts', exist_ok=True)

req = urllib.request.Request(CSS_URL, headers={'User-Agent': UA})
css = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
print('css2 получен:', len(css), 'байт')

# Разбираем блоки: /* subset */ @font-face { ... }
blocks = re.findall(r'/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{[^}]+\})', css)
keep = [b for b in blocks if b[0] in ('cyrillic', 'cyrillic-ext', 'latin', 'latin-ext')]
print('подмножества:', sorted({b[0] for b in keep}), '| правил:', len(keep))

# Скачиваем woff2, переписываем пути
out_css = ['/* Династия Дерева: локальные шрифты (Golos Text + Lora) */']
seen = {}
n = 0
for subset, block in keep:
    url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
    if url not in seen:
        fname = 'f' + str(len(seen)) + '-' + url.rsplit('/', 1)[-1]
        seen[url] = fname
        data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()
        io.open('assets/fonts/' + fname, 'wb').write(data)
        n += 1
    out_css.append(block.replace(url, seen[url]))
    print(' ', subset, '->', seen[url], len(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()) // 1024, 'КБ')

io.open('assets/fonts/fonts.css', 'w', encoding='utf-8').write(
    '/* Локальные шрифты Google Fonts: Golos Text + Lora (латиница, кириллица) */\n' + '\n'.join(out_css) + '\n')
print('woff2 скачано:', n, '| fonts.css готов')
