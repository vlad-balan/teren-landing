# Переезд на Beget — инструкция

Сайт статический, заявки и админка — на PHP + SQLite (эта папка).
Локальный Node-сервер (`server/`) нужен только для разработки.

## Что переносим в public_html

| Что | Откуда (репозиторий) | Куда (Beget) |
|---|---|---|
| Все HTML-страницы | `*.html` | `public_html/` |
| Стили, скрипты, иконки | `assets/` | `public_html/assets/` |
| Фото объектов | `images/` | `public_html/images/` |
| Страницы проектов | `projects/` | `public_html/projects/` |
| Документация PDF | `Планы/` | `public_html/Планы/` (~60 МБ, грузить целиком) |
| SEO | `sitemap.xml`, `robots.txt` | `public_html/` |
| **Бэкенд заявок** | `deploy/beget/api.php` | `public_html/api.php` |
| **Админ-панель** | `deploy/beget/admin.html` | `public_html/admin.html` |
| **Реврайты и кэш** | `deploy/beget/.htaccess` | `public_html/.htaccess` |

**НЕ переносим:** `CNAME` (файл GitHub Pages), `server/*.js`, `server/package*.json`,
`server/.env`, `node_modules/`, `logo-concepts*.html` (черновики логотипа).

## Заявки и админка (5 минут)

1. **Пароль.** В `public_html` создайте файл `admin-config.php`:
   ```php
   <?php return 'ВАШ_НОВЫЙ_ПАРОЛЬ';
   ```
   Без него работает пароль по умолчанию `admin123` — обязательно смените.
   Файл добавлен в `.gitignore` и в git не попадёт.

2. **База.** Заявки хранятся в `server/data/leads.db` (SQLite).
   - Если есть локальные заявки — загрузите папку `server/data/` (с `leads.db`)
     в `public_html/server/data/`. Папка закрыта от веба правилом в `.htaccess`.
   - Если нет — не загружайте, `api.php` создаст базу сам при первой заявке.

3. **Проверка PHP.** В панели Beget: сайт → PHP 8.x, расширение `pdo_sqlite`
   (на Beget включено по умолчанию).

После этого формы на сайте шлют заявки на `/api/leads` (реврайт в `api.php`),
а админка доступна на `https://derevo-777.ru/admin`.

## Домен и DNS

1. В панели Beget: «Домены» → прикрепить `derevo-777.ru` к сайту.
   Beget предложит направить DNS на `ns1.beget.com` / `ns2.beget.com` —
   поменяйте NS у регистратора домена.
2. На GitHub: Settings → Pages → **Remove custom domain**
   (иначе GitHub будет перехватывать домен), сайт можно оставить как приватный
   бэкап или удалить.
3. Дождаться обновления DNS (от 15 минут до суток), включить бесплатный SSL
   (Let's Encrypt) в панели Beget.

## Проверка после переезда

- [ ] Сайт открывается по `https://derevo-777.ru`, адреса без `.html` работают
      (`/projects`, `/projects/besedka-chiverevo`);
- [ ] Отправьте тестовую заявку любой формой — появится в админке;
- [ ] `/admin` открывается по новому паролю, вложение скачивается;
- [ ] `https://derevo-777.ru/sitemap.xml` отдаётся и показывает домен
      `derevo-777.ru` (сборщик уже настроен на этот домен по умолчанию);
- [ ] Через 1–2 недели: Яндекс.Вебмастер / Search Console — переезд домена
      (инструмент «Переезд сайта»), если позиции важны.

## Обновление сайта потом

Через Git (если на тарифе есть SSH): `git pull` в папке сайта — и всё.
Через панель: повторная загрузка изменённых файлов файловым менеджером.
Страницы проектов при изменении `projects-data.js` пересобираются локально:
`node tools/build-projects.mjs` и загружаются заново.
