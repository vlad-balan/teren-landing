# -*- coding: utf-8 -*-
"""Аудит внутренней перелинковки: битые ссылки, сироты, глубина, форматы адресов."""
import os, re, sys, json
from collections import defaultdict
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# служебные страницы — не участвуют в графах и не обязаны иметь входящие
UTILITY = {'admin.html', 'logo-concepts.html', 'logo-concepts-2.html', 'project.html',
           'server/admin.html', '404.html'}

HREF_RE = re.compile(r'<a\b[^>]*?href\s*=\s*["\']([^"\'#]*)["\'][^>]*?>(.*?)</a>', re.S | re.I)
TAG_RE = re.compile(r'<[^>]+>')

def read_text(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

pages = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git', 'node_modules', 'server', 'Планы')]
    for fn in filenames:
        if fn.endswith('.html'):
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT).replace('\\', '/')
            pages.append(rel)
pages.sort()

def resolve(src, href):
    """Возвращает локальный путь-цель ссылки или None (внешняя/якорная)."""
    href = href.strip()
    if not href or href.startswith(('mailto:', 'tel:', 'javascript:', 'data:')):
        return None
    if href.startswith('#'):
        return ('anchor', href[1:])  # внутренний якорь
    parsed = urlparse(href)
    if parsed.scheme or parsed.netloc:
        return None
    path_part = unquote(parsed.path)
    if path_part.startswith('/'):
        target = path_part.lstrip('/')
    else:
        base_dir = os.path.dirname(src)
        target = os.path.normpath(os.path.join(base_dir, path_part)).replace('\\', '/')
    return ('page', target, parsed.fragment or None)

outlinks = defaultdict(set)   # src -> {target_path}
inlinks = defaultdict(set)    # target_path -> {src}
broken = []                   # (src, href, target)
anchors_missing = []          # (src, href) — якорь внутри той же страницы не найден
noindex_pages = set()

for p in pages:
    html = read_text(p)
    for m in HREF_RE.finditer(html):
        href = m.group(1).strip()
        r = resolve(p, href)
        if r is None:
            continue
        if r[0] == 'anchor':
            frag = r[1]
            if frag and ('id="%s"' % frag) not in html and ("id='%s'" % frag) not in html:
                anchors_missing.append((p, href))
            continue
        _, target, frag = r
        outlinks[p].add(target)
        if target == '' :
            # ссылка на корень
            target = 'index.html'
        # существование файла: .html, без расширения (clean URL), / -> index.html
        exists = False
        candidates = [target]
        if not target.endswith('.html'):
            candidates.append(target + '.html')
        if target.endswith('/'):
            candidates.append(target + 'index.html')
        for c in candidates:
            if os.path.isfile(os.path.join(ROOT, c)):
                exists = True
                target = c if c != target and os.path.isfile(os.path.join(ROOT, c)) and not target.endswith('.html') else target
                break
        if not exists:
            broken.append((p, href, target))
            continue
        # нормализуем цель для графа
        norm = target
        if not norm.endswith('.html') and os.path.isfile(os.path.join(ROOT, norm + '.html')):
            norm = norm + '.html'
        elif norm.endswith('/') and os.path.isfile(os.path.join(ROOT, norm + 'index.html')):
            norm = norm + 'index.html'
        if norm == '' : norm = 'index.html'
        inlinks[norm].add(p)
        if frag:
            tgt_html = read_text(norm) if norm in pages or os.path.isfile(os.path.join(ROOT, norm)) else ''
            if tgt_html and ('id="%s"' % frag) not in tgt_html and ("id='%s'" % frag) not in tgt_html:
                anchors_missing.append((p, href))

# ---- сироты ----
real_pages = [p for p in pages if p not in UTILITY]
orphans = [p for p in real_pages if not inlinks.get(p)]

# ---- глубина от главной (BFS) ----
depth = {'index.html': 0}
queue = ['index.html']
while queue:
    cur = queue.pop(0)
    for t in outlinks.get(cur, ()):
        norm = t
        if not norm.endswith('.html') and os.path.isfile(os.path.join(ROOT, norm + '.html')):
            norm += '.html'
        if norm in pages and norm not in depth:
            depth[norm] = depth[cur] + 1
            queue.append(norm)

# ---- форматы: .html vs clean в навигационных ссылках ----
fmt = defaultdict(int)
for p in pages:
    html = read_text(p)
    for m in re.finditer(r'href="(/?[A-Za-z0-9_\-/]+)(\.html)?"', html):
        path = m.group(1)
        if any(x in path for x in ('assets', 'images', '.css', '.js', '.pdf', '.webp', '.jpg', '.png')):
            continue
        fmt['clean' if not m.group(2) else 'html'] += 1

print('=== СТРАНИЦ:', len(real_pages), '(+служебные:', len(UTILITY), ') ===\n')
print('=== БИТЫЕ ССЫЛКИ (%d) ===' % len(broken))
for s, h, t in broken:
    print('  %s -> %s (цель %s не найдена)' % (s, h, t))
print('\n=== ССЫЛКИ НА НЕСУЩЕСТВУЮЩИЕ ЯКОРИ (%d) ===' % len(anchors_missing))
for s, h in anchors_missing[:40]:
    print('  %s -> %s' % (s, h))
print('\n=== СИРОТЫ (нет входящих; %d) ===' % len(orphans))
for p in orphans:
    print('  %s' % p)
print('\n=== ГЛУБИНА ОТ ГЛАВНОЙ ===')
by_depth = defaultdict(list)
for p, d in depth.items():
    if p in real_pages:
        by_depth[d].append(p)
for d in sorted(by_depth):
    print('  клик %d: %d стр.: %s' % (d, len(by_depth[d]), ', '.join(sorted(by_depth[d])[:12]) + (' ...' if len(by_depth[d]) > 12 else '')))
unreached = [p for p in real_pages if p not in depth]
print('  НЕДОСТИЖИМЫ от главной (%d): %s' % (len(unreached), ', '.join(sorted(unreached))))
print('\n=== ВХОДЯЩИЕ ССЫЛКИ (топ-30 по числу) ===')
for t, srcs in sorted(inlinks.items(), key=lambda kv: -len(kv[1]))[:30]:
    print('  %3d <- %s' % (len(srcs), t))
print('\n=== ФОРМАТЫ ВНУТРЕННИХ ССЫЛОК ===  html=%(html)d  clean=%(clean)d' % dict(fmt))
