# -*- coding: utf-8 -*-
"""Разведка проектов из папки Планы/: названия листов, факты, рендеры визуализаций."""
import pymupdf, os, re, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANS = os.path.join(ROOT, 'Планы')
OUT = os.path.join(ROOT, 'assets', 'img', 'projects', '_scan')
os.makedirs(OUT, exist_ok=True)

TITLE_RE = re.compile(
    r'^(Титульный|Ведомость чертежей|Пояснительная записка|Общие данные|Общие указания|'
    r'Маркировочный план|Размерный план|Схема расположения|План расстановки мебели|'
    r'План покрытия пола|Пироги пола|Пирог пола|План покрытия стен|Пироги стен|Пироги стены|'
    r'План размещения розеток|План размещения светильников|План т[её]плого пола|План крыши|'
    r'Ведомость заполнения оконных|Ведомость оконных|Ведомость заполнения дверных|Ведомость дверных|'
    r'Разрез\s*[\d\-]+|Фасад\s*[\d\-]+|Фасад\s*[А-Я]\-[А-Я]|Аксонометрия|Визуализация|'
    r'Экспликация|Узлы|Узел|Спецификация|Таблица|Схема)')
FACT_KEYS = ['Тип строения', 'Габаритные размеры каркаса', 'Общая площадь застройки',
             'Этажность', 'Конструктивная схема', 'Несущие  конструкции', 'Несущие конструкции',
             'Покрытие кровли', 'Стропильная система', 'Тип крыши', 'Фундамент',
             'Относительная отм']

PROJECTS = {
    'milorado': 'АР_03_Милорадово',
    'arh28': 'АР_Архитектурные решения от 28.07',
    'selco': 'АР_Новое сельцо( проект+визы)',
    'selco2': 'АР_Новое сельцо_2',
    'chiverevo': 'АР_Чиверево',
}

def main():
    result = {}
    mat = pymupdf.Matrix(2.0, 2.0)
    for key, folder in PROJECTS.items():
        files = os.listdir(os.path.join(PLANS, folder))
        mains = [f for f in files if f == folder + '.pdf']
        main_pdf = os.path.join(PLANS, folder, mains[0])
        doc = pymupdf.open(main_pdf)
        sheets, facts, viz_pages = [], {}, []
        for i, page in enumerate(doc, 1):
            text = page.get_text()
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            title = next((l for l in lines if TITLE_RE.match(l)), None)
            if not title:
                # пробуем склейку соседних строк ("План размещения светильников и" + "выключателей")
                for a, b in zip(lines, lines[1:]):
                    if TITLE_RE.match(a) and len(a) < 45:
                        title = (a + ' ' + b).strip(); break
            sheets.append({'page': i, 'title': title or '', 'imgs': len(page.get_images())})
            if page.get_images():
                viz_pages.append(i)
        # факты со страницы пояснительной записки (там "Тип строения")
        for i, page in enumerate(doc, 1):
            t = page.get_text()
            if 'Тип строения' in t or 'Общая площадь застройки' in t:
                lines = [l.strip() for l in t.split('\n') if l.strip()]
                for k, line in enumerate(lines):
                    for fk in FACT_KEYS:
                        if line.startswith(fk):
                            val = line[len(fk):].strip()
                            if not val and k + 1 < len(lines):
                                val = lines[k + 1].strip()
                            if not val and k + 2 < len(lines) and not any(x in lines[k+1] for x in ['м2','кгс','район','этаж']):
                                val = lines[k + 2].strip()
                            facts[fk.strip()] = val
                break
        # рендер страниц с картинками (кандидаты визуализаций) — до 6 последних
        rendered = []
        for p in (viz_pages[-6:] if len(viz_pages) > 6 else viz_pages):
            out = os.path.join(OUT, f'{key}-p{p}.png')
            doc[p - 1].get_pixmap(matrix=mat).save(out)
            rendered.append(os.path.basename(out))
        result[key] = {
            'folder': folder, 'pdf': mains[0], 'pages': doc.page_count,
            'sheets': sheets, 'facts': facts, 'rendered': rendered,
            'separate_sheet_pdfs': len(files) - 1,
        }
        doc.close()
    print(json.dumps(result, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
