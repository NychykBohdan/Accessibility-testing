# Як це працює

Технічний опис фреймворку для тестування доступності saucedemo.com: з яких частин він складається, як проходить один прогін від тесту до опублікованого звіту, а також які правила й домовленості діють у коді.

- **[README](../README.md)** — що це за проєкт і як його запустити.
- **[A11Y-REPORT](../A11Y-REPORT.md)** — що саме знайдено на сайті.
- **Цей документ** — як фреймворк влаштований зсередини.

## Зміст

1. [Загальна схема](#1-загальна-схема)
2. [Проєкти Playwright: що де запускається](#2-проєкти-playwright-що-де-запускається)
3. [Фікстури та Page Objects](#3-фікстури-та-page-objects)
4. [axe-сканування: життєвий цикл `a11yScan`](#4-axe-сканування-життєвий-цикл-a11yscan)
5. [Baseline відомих порушень](#5-baseline-відомих-порушень)
6. [Клавіатурні тести](#6-клавіатурні-тести)
7. [Медіа-налаштування та візуальні перевірки фокуса](#7-медіа-налаштування-та-візуальні-перевірки-фокуса)
8. [Звітність](#8-звітність)
9. [CI/CD](#9-cicd)
10. [Типові задачі](#10-типові-задачі)
11. [Стабільність і відомі особливості](#11-стабільність-і-відомі-особливості)

---

## 1. Загальна схема

```
                    ┌────────────────────────── tests/ ───────────────────────────┐
                    │ unit · smoke · a11y · keyboard · media · visual              │
                    └──────────────┬───────────────────────────────┬──────────────┘
                                   │ фікстури                       │ хелпери фокуса
                                   ▼                                ▼
  src/fixtures/pages.fixture.ts ─► Page Objects (src/pages)   src/keyboard/focus.ts
  (loggedInPage, loginPage, …)        │ локатори + дії              │ tabUntil, isFocusVisible, …
                                      │
  src/a11y/axe.fixture.ts ──► a11yScan(scanKey) ──► axe-core (теги WCAG 2.1 A/AA)
                                      │
                                      ├─► порівняння з a11y-baseline.json ─► assert / анотації
                                      ├─► testInfo.attach (JSON + текст) ──► HTML-звіт Playwright
                                      └─► reports/a11y-results/<scanKey>.json
                                                    │
                     scripts/a11y-summary.ts ◄──────┘
                       ├─► reports/a11y-summary.md  ─► GitHub Job Summary
                       └─► reports/a11y-summary.html ┐
                     scripts/build-pages.ts ◄────────┘ + playwright-report/ + reports/results.json
                       └─► site/ ─► GitHub Pages
```

Фреймворк має два незалежні «рушії перевірки»:

| Рушій | Що перевіряє | Де |
|---|---|---|
| **axe-core** | статичну розмітку: ролі, імена, ARIA, контраст тощо | `tests/a11y` |
| **Поведінкові тести** | взаємодію: Tab-порядок, клавіші, керування фокусом, видимість фокуса, медіа-налаштування | `tests/keyboard`, `tests/media`, `tests/visual` |

axe на saucedemo порушень WCAG 2.1 A/AA не знаходить. Із 12 проблем у A11Y-REPORT вісім (A11Y-001…007, 012) знайдено й підтверджено поведінковими тестами, решту чотири (A11Y-008…011) — ручною перевіркою.

---

## 2. Проєкти Playwright: що де запускається

Налаштування — у [`playwright.config.ts`](../playwright.config.ts).

| Проєкт | Браузер | Які тести | Навіщо так |
|---|---|---|---|
| `unit` | (Chromium — лише для одного тесту) | `tests/unit` | Чисті функції: форматування, baseline, зведення, ключі. Один тест відкриває сторінку, щоб прогнати axe по згенерованих HTML-звітах |
| `chromium` | Desktop Chrome | усе, крім `unit` | Єдиний десктопний рушій для axe і візуальних знімків: результати axe відрізняються між рушіями, а baseline має бути однозначним |
| `firefox` | Desktop Firefox | smoke, keyboard, media | Поведінка клавіатури й фокуса залежить від рушія |
| `webkit` | Desktop Safari | smoke, keyboard, media | Те саме |
| `mobile-chromium` | iPhone 13 (метрики) на Chromium | лише `a11y/pages` і `a11y/states` | Мобільний в'юпорт; рушій той самий, що й у десктопного baseline. До ключів сканувань автоматично додається `@mobile` |

Глобальні налаштування:

| Налаштування | Значення |
|---|---|
| `baseURL` | змінна `BASE_URL`, за замовчуванням `https://www.saucedemo.com` |
| `testIdAttribute` | `data-test` |
| `trace` | `retain-on-failure` |
| `screenshot` | `only-on-failure` |
| `retries` | 2 у CI, 0 локально (виняток — menu-спек, див. [§11](#11-стабільність-і-відомі-особливості)) |
| Репортери локально | `list`, `html` (`playwright-report/`), `json` (`reports/results.json`) |
| Репортери в CI | `list`, `blob`, `json` |

---

## 3. Фікстури та Page Objects

### Page Objects (`src/pages`)

- **Лише локатори й дії**, без `expect`. Перевірки живуть у тестах або в `tests/support/` (наприклад, `expectMenuOpen`).
- **Пріоритет локаторів:** `getByRole` → `getByLabel` → `getByTestId` → CSS. CSS використано лише там, де немає ролі чи `data-test`, наприклад `.bm-menu-wrap` (панель меню) і `.inventory_details_container`.
- **`BasePage.goto()`** відкриває сторінку з `waitUntil: 'domcontentloaded'`. На живому сайті сторонні ресурси іноді затримують подію `load` на 30 s і більше. Тому після кожного переходу тест сам чекає на локатор, характерний для нової сторінки.
- **Застарілий вигляд SPA.** Одразу після зміни URL saucedemo ще деякий час показує попередній вигляд, а сторінки використовують однакові `data-test` (наприклад, `inventory-item-name`). Тому `ItemPage` обмежує свої локатори карткою деталей, а тести перед дією чекають специфічний елемент нової сторінки.
- **`a11yExclude`** — список селекторів, які axe має пропустити (сторонні віджети). Він задається в Page Object і передається в `a11yScan`. Зараз список порожній: сторонніх віджетів на сайті немає.
- **`AuthenticatedPage`** — спільна шапка для сторінок після входу: компонент `BurgerMenu`, посилання на кошик і бейдж кошика.

### Фікстури (`src/fixtures/pages.fixture.ts`)

| Фікстура | Область | Що робить |
|---|---|---|
| `loginPage`, `inventoryPage`, `itemPage`, `cartPage`, `checkoutStepOnePage`, `checkoutStepTwoPage`, `checkoutCompletePage` | тест | Page Object на поточній `page` |
| `authSession` | воркер | **Один раз на воркер** входить через справжній UI і зберігає cookie сесії `session-username`. Cookie живе 10 хв; якщо до кінця лишилось менше 60 s, вхід повторюється |
| `loggedInPage` | тест | Додає cookie в контекст, відкриває `/inventory.html`, **чекає на перший товар** і повертає `InventoryPage` |

`src/a11y/axe.fixture.ts` розширює ці фікстури двома своїми:

| Фікстура | Що робить |
|---|---|
| `makeAxeBuilder()` | Повертає `AxeBuilder`, налаштований на теги `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. Це **єдине місце**, де задаються теги |
| `a11yScan(scanKey, options?)` | Повний цикл сканування (див. [§4](#4-axe-сканування-життєвий-цикл-a11yscan)) |

Тести імпортують `test`/`expect` або з `src/fixtures/pages.fixture.ts` (без axe), або з `src/a11y/axe.fixture.ts` (з axe). Створювати `new AxeBuilder()` напряму в тестах заборонено.

---

## 4. axe-сканування: життєвий цикл `a11yScan`

Реалізація: [`src/a11y/scan.ts`](../src/a11y/scan.ts).

```ts
await expect(checkoutStepOnePage.error).toHaveText(/First Name is required/); // стан стабільний
await a11yScan('checkout-step-one:validation-errors', { exclude: checkoutStepOnePage.a11yExclude });
```

### Кроки

1. **Формування ключа.** Якщо в проєкту є `metadata.a11yVariant` (у `mobile-chromium` це `mobile`), до ключа додається `@mobile`. Якщо ключ уже має варіант і проєкт додає ще один, сканування завершується помилкою.
2. **Валідація ключа** за шаблоном `^[a-z0-9-]+(:[a-z0-9-]+)*(@[a-z0-9-]+)?$`. Ключ складається з сегментів у kebab-case, розділених `:`, і може мати один варіант після `@`.
3. **Налаштування AxeBuilder:** `include` (наприклад, сканувати лише меню) і `exclude` (з Page Object).
4. **`analyze()`**, після чого порушення сортуються від найсерйознішого до найменш серйозного.
5. **Порівняння з baseline** (див. [§5](#5-baseline-відомих-порушень)). У режимі оновлення baseline цей крок пропускається.
6. **Вкладення у звіт:** `axe-<scanKey>.json` (повний запис) і `axe-<scanKey>.txt` (читабельний список, до 10 targets на правило).
7. **Запис файлу** `reports/a11y-results/<ім'я>.json`, якщо не передано `persist: false`. Символи `:` і `@` замінюються на `_`, бо на Windows вони заборонені в іменах файлів: `checkout-step-one:validation-errors@mobile` → `checkout-step-one_validation-errors_mobile.json`.
8. **Анотації та assert:** тест падає лише на **нових** порушеннях рівня `critical`/`serious`.

### Ключі сканувань

| Ключ | Сторінка / стан |
|---|---|
| `login`, `inventory`, `item`, `cart`, `checkout-step-one`, `checkout-step-two`, `checkout-complete` | сторінки в стані за замовчуванням |
| `login:error` | логін з порожньою формою |
| `login:error:wrong-password` | логін з неправильним паролем |
| `login:locked-user` | заблокований користувач |
| `inventory:menu-open` | відкрите меню (скан **лише** панелі меню через `include`) |
| `inventory:sorted` | після сортування |
| `cart:empty` | порожній кошик |
| `checkout-step-one:validation-errors` | помилки валідації |
| `…@mobile` | ті самі 14 ключів у проєкті `mobile-chromium` (варіант додається автоматично) |
| `login@forced-colors`, `inventory@forced-colors`, `inventory:menu-open@forced-colors` | режим `forced-colors: active` (варіант задано в тесті явно) |

### Формат запису (`src/a11y/records.ts`)

```jsonc
{
  "scanKey": "inventory:sorted",
  "url": "https://www.saucedemo.com/inventory.html",
  "project": "chromium",
  "testTitle": "inventory page › sorted list has no new serious violations",
  "timestamp": "…",
  "tags": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  "counts": { "critical": 0, "serious": 0, "moderate": 0, "minor": 0 },   // кількість порушених ПРАВИЛ
  "comparison": { "baselineMissing": false, "new": [], "known": [], "fixed": [] }, // null у режимі оновлення
  "results": { /* повний, незмінений вивід axe: violations, incomplete, passes, … */ }
}
```

### Анотації в HTML-звіті

| Тип | Коли з'являється | Чи падає тест |
|---|---|---|
| `baseline-missing` | ключа немає в `a11y-baseline.json` (усі порушення вважаються новими) | лише якщо є нові critical/serious |
| `warning` | нове порушення рівня `moderate`/`minor` | ні |
| `fixed-since-baseline` | правило є в baseline, але axe його більше не знаходить | ні |
| `needs-review` | axe повернув `incomplete` (не зміг вирішити, наприклад контраст поверх псевдоелемента) | ні |

### Правило стабільного стану

Сканувати можна лише після того, як стан видно через **конкретний локатор**. Використовувати `waitForTimeout` заборонено. Для меню є спеціальне очікування `expectMenuOpen` у `tests/support/menu.ts`: `aria-hidden="false"`, панель видима і `transform: none` (анімація 0.5s завершилась).

---

## 5. Baseline відомих порушень

Файл [`a11y-baseline.json`](../a11y-baseline.json), логіка — [`src/a11y/baseline.ts`](../src/a11y/baseline.ts).

```json
{ "inventory": [], "inventory:menu-open@forced-colors": [], "login@mobile": [] }
```

Формат: `{ [scanKey]: ruleId[] }`. Зараз усі 31 масиви порожні, бо axe не знаходить на сайті порушень WCAG 2.1 A/AA.

### Логіка порівняння

| Категорія | Визначення | Наслідок |
|---|---|---|
| `new` | правило знайдено, але його немає в baseline для цього ключа | `critical`/`serious` → **тест падає**; `moderate`/`minor` → `warning` |
| `known` | правило знайдено й воно є в baseline | нічого |
| `fixed` | правило є в baseline, але не знайдено | `fixed-since-baseline` |
| ключа немає | — | `baseline-missing`; усе вважається `new` |

**Гранулярність — rule id, а не окремі вузли.** Це свідомий компроміс: файл стабільний і зручний для рев'ю. Ціна така: якщо порушення `color-contrast` уже є в baseline, ще один низькоконтрастний елемент тест не зламає.

### Оновлення baseline (`npm run baseline:update`)

Скрипт [`scripts/baseline-update.ts`](../scripts/baseline-update.ts):

1. Очищає `reports/a11y-results/`.
2. Запускає `playwright test tests/a11y --project=chromium --project=mobile-chromium --retries=1` з `UPDATE_A11Y_BASELINE=1`. У цьому режимі сканування записують результати, але **нічого не перевіряють**, а тест-доказ (див. нижче) пропускається.
3. Якщо прогін упав, baseline **не змінюється**.
4. Збирає baseline із записів проєктів `chromium` і `mobile-chromium`: ключі й rule id сортуються, дублікати об'єднуються, тож результат детермінований.
5. Виводить diff (`+ ключ: правило`, `- ключ: правило`). Його потрібно пояснити в коміті.

Редагувати `a11y-baseline.json` вручну заборонено.

### Тест-доказ (`tests/a11y/baseline-guard.a11y.spec.ts`)

Тест вставляє на сторінку логіну `<img>` без `alt` і перевіряє, що `a11yScan('login', { persist: false })` **кидає помилку** з текстом про нове `[critical] image-alt`. Так доводиться, що зелений baseline справді щось ловить. Результат цього тесту ніколи не записується (`persist: false`), а в режимі оновлення сам тест пропускається.

---

## 6. Клавіатурні тести

### Хелпери (`src/keyboard/focus.ts`)

| Хелпер | Що повертає / робить |
|---|---|
| `getFocusedElementInfo(page)` | `{ isBody, tag, id, dataTest, role, name }`. Роль і доступне ім'я береться з accessibility snapshot Playwright, а не обчислюється вручну |
| `describeFocus(info)` | рядок на кшталт `button "Login" [login-button]` або `<body> (focus lost)` |
| `tabUntil(page, predicate, { maxSteps, key })` | натискає Tab (або Shift+Tab), доки фокус не задовольнить умову. Якщо ціль не досягнуто, **кидає помилку з повним пройденим шляхом** — це водночас перевірка на keyboard trap і на недосяжні елементи |
| `tabSequence(page, n)` | n натискань Tab → список зупинок фокуса |
| `isFocusVisible(page)` | чи має сфокусований елемент `outline` (не `none`, ширина > 0, непрозорий колір) або `box-shadow` (за computed style) |
| `auditFocusIndicators(page, n)` | n зупинок фокуса, для кожної — `{ info, visible }` |
| `byName(name, role?)`, `byTestId(id)` | готові умови для `tabUntil` |

Тести визначають фокус лише через ці хелпери, без власних `page.evaluate`. Для простих перевірок використовується вбудований `expect(locator).toBeFocused()`.

### Політика `test.fail()`

Якщо тест відтворює **реальну проблему сайту**, його не підганяють під баг:

```ts
test('menu › focus returns to the menu button after closing with Escape', async ({ page, loggedInPage }) => {
  // A11Y-003: after closing, focus falls back to <body> instead of the trigger button.
  test.fail(true, 'A11Y-003: focus is not returned to the menu button');
  …
  await expect(loggedInPage.menu.openButton).toBeFocused();   // ← саме ця перевірка має падати
});
```

Вимоги до таких тестів:

- У тесті є коментар та опис з **ID із A11Y-REPORT.md**.
- **Тест має падати саме на останній перевірці, яка описує баг.** Якщо він падає раніше (таймаут, порожня сторінка, забута фікстура), `test.fail` «пройде» з хибної причини. Під час розробки кожен такий тест перевіряли через JSON-звіт: дивились на текст першої помилки.
- Для детекторів, які можуть бути «вічно червоними» (видимість фокуса), є **самоперевірка** з підставленим виправленням (див. [§7](#7-медіа-налаштування-та-візуальні-перевірки-фокуса)).
- Коли сайт виправлять, Playwright повідомить «Expected to fail, but passed». Тоді `test.fail` треба прибрати, а статус проблеми в A11Y-REPORT оновити.

### Особливості браузерів

- **WebKit не включає посилання в Tab-послідовність** (як Safari з вимкненим налаштуванням «Press Tab to highlight each item»). Тести, яким потрібен Tab по посиланнях, пропускаються з причиною `WEBKIT_SKIPS_LINKS` (`tests/support/browser.ts`).
- **Після навігації** спершу чекають на локатор нової сторінки, і лише потім натискають Tab. Інакше опитування фокуса під час переходу падає з «Execution context was destroyed».
- **Програмний `focus()`** використовується лише як стартова точка (наприклад, щоб поставити фокус на пункт меню в WebKit). Сама перевірка завжди йде через клавіатуру.

---

## 7. Медіа-налаштування та візуальні перевірки фокуса

### `tests/media` (усі браузери)

| Тест | Емуляція | Що перевіряє |
|---|---|---|
| reduced motion | `test.use({ reducedMotion: 'reduce' })` | `transition-duration` панелі меню має бути `0s` → `test.fail` A11Y-012 |
| forced colors | `test.use({ forcedColors: 'active' })` | чи видно індикатор фокуса в режимі високого контрасту → `test.fail` A11Y-001. Лише Chromium: в інших рушіях емуляція не підтримується |

axe-сканування в режимі forced-colors лежать окремо, у `tests/a11y/media.a11y.spec.ts`.

### `tests/visual` (лише Chromium)

1. **«changes appearance»** знімає область навколо елемента до і після фокуса з клавіатури та вимагає, щоб знімки **відрізнялися**. Еталони для цього не потрібні, тож перевірка працює на будь-якій ОС. Перед першим знімком тест чекає `document.fonts.ready` і завантаження всіх `img` в області, щоб пізнє довантаження не сприйнялось як зміна фокуса.
2. **«matches snapshot»** — регресійний `toHaveScreenshot` сфокусованого стану. Еталони лежать у `tests/__screenshots__/<platform>/…`, окремо для кожної платформи, бо шрифти рендеряться по-різному.
3. **Самоперевірка детекторів** підставляє рекомендоване виправлення (`:focus-visible { outline: 3px solid … }`) і вимагає, щоб і піксельна перевірка, і `isFocusVisible` побачили кільце фокуса. Без неї червоні тести A11Y-001 нічого б не доводили.

Наразі закомічено лише еталони `win32`, тому в CI chromium-лег запускається з `--ignore-snapshots`. Перевірки «changes appearance» від цього не залежать і працюють.

---

## 8. Звітність

| Артефакт | Звідки | Вміст |
|---|---|---|
| `playwright-report/` | html-репортер (у CI — `merge-reports`) | усі тести, трейси, скриншоти, вкладення axe, анотації |
| `reports/results.json` | json-репортер | статистика прогону (для головної сторінки) |
| `reports/a11y-results/*.json` | `a11yScan` | запис кожного сканування |
| `reports/a11y-summary.md` / `.html` | `npm run a11y:summary` | таблиця ключ × critical/serious/moderate/minor/needs review + статус baseline; топ порушених правил; правила для ручної перевірки |
| `$GITHUB_STEP_SUMMARY` | той самий скрипт, якщо змінна задана | Markdown-зведення на сторінці запуску в GitHub Actions |
| `site/` | `npm run pages:build` | `index.html` + `report/` + `a11y-summary.html` для GitHub Pages |

Логіку винесено в чисті функції (`src/a11y/summary.ts`, `src/a11y/pages-index.ts`), а скрипти лише читають і пишуть файли. Тому все покрито unit-тестами.

Деталі:

- **Статус baseline у зведенні:** `clean` / `known only` / `NEW` / `not in baseline` / `not compared`.
- **Головна сторінка** окремо рахує «відомі дефекти» — тести з `expectedStatus: 'failed'`, тобто `test.fail`. Інакше вони б зливалися з «passed».
- **Згенеровані сторінки самі доступні:** `lang`, `h1`, таблиці з `caption` і `scope`, видимий `:focus-visible`, темна тема, `prefers-reduced-motion`. Unit-тест проганяє по них axe.
- **Посилання на репозиторій** на головній сторінці беруться з `REPO_URL` або з `GITHUB_SERVER_URL`/`GITHUB_REPOSITORY` у CI.

Скриншоти для README генерує `node scripts/docs-screenshots.ts` (після `npm test`, `a11y:summary` і `pages:build`).

---

## 9. CI/CD

Workflow: [`.github/workflows/a11y.yml`](../.github/workflows/a11y.yml).

```
push(main) / pull_request / workflow_dispatch / schedule (пн 06:00 UTC)
   │
   ├─ lint ─────────── typecheck · ESLint · Prettier
   │
   ├─ test (matrix) ── chromium: --project=chromium --project=unit --project=mobile-chromium --ignore-snapshots
   │                   firefox:  --project=firefox
   │                   webkit:   --project=webkit
   │                   └─ артефакти: blob-report-<browser>, reports-<browser> (14 днів)
   │
   ├─ summary ──────── (навіть якщо тести впали)
   │                   download blob-report-* → merge-reports --reporter=html,json
   │                   download reports-chromium (записи axe) → a11y:summary → Job Summary
   │                   pages:build → artifact playwright-report; на main — upload-pages-artifact
   │
   └─ deploy-report ── лише main, не PR: deploy-pages (pages: write, id-token: write)
```

- **Унікальні імена blob-звітів** задає `PLAYWRIGHT_BLOB_OUTPUT_NAME=report-<browser>.zip`; без цього звіти трьох легів перезаписали б один одного при злитті.
- **Звіт публікується навіть після червоного прогону** — щоб падіння можна було розібрати. Бейдж при цьому червоний.
- **Розклад раз на тиждень:** сайт живий і може змінитися без жодного коміту в цьому репозиторії.
- **Dependabot** (`.github/dependabot.yml`) раз на місяць оновлює GitHub Actions і npm-залежності (Playwright/axe групою).

---

## 10. Типові задачі

### Додати сканування нового стану

1. У потрібному тестовому файлі `tests/a11y/*.a11y.spec.ts`: довести UI до стану через Page Object.
2. Дочекатися конкретного локатора.
3. Викликати `a11yScan('<сторінка>:<стан>', { exclude: po.a11yExclude })`.
4. Запустити `npm run baseline:update`. Новий ключ (`+ ключ (new key)`) з'явиться і в desktop-, і в `@mobile`-варіанті.
5. Закомітити тест разом із baseline і поясненням diff.

### Задокументувати нову знайдену проблему

1. Додати розділ `A11Y-0NN` в A11Y-REPORT.md: опис, критерій WCAG, кроки відтворення, очікуваний і фактичний результат, рекомендація, severity, джерело.
2. Написати тест з `test.fail(true, 'A11Y-0NN: …')` і коментарем, у якому остання перевірка описує саме баг.
3. Переконатися, що тест падає саме на цій перевірці. Найпростіше: тимчасово прибрати `test.fail` і подивитися на текст помилки.

### Сайт виправив проблему

- **axe-правило:** з'явиться анотація `fixed-since-baseline`. Запустити `baseline:update`, закомітити diff `- ключ: правило`.
- **Поведінковий баг:** тест стане «Expected to fail, but passed». Прибрати `test.fail`, позначити проблему в A11Y-REPORT як виправлену.
- **Видимий фокус (A11Y-001):** додатково оновити еталони `toHaveScreenshot` (`--update-snapshots`).

### Додати еталони знімків для Linux (CI)

```bash
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.1-noble \
  npx playwright test tests/visual --update-snapshots
```

Закомітити `tests/__screenshots__/linux` і прибрати `--ignore-snapshots` з workflow.

### Розібрати нестабільний тест

1. `reports/results.json`: знайти тести зі `status: "flaky"` і подивитися перший `error.message` у невдалій спробі.
2. `test-results/<тест>/trace.zip` → `npx playwright show-trace`: який крок не завершився.
3. Розрізнити три випадки:
   - **інфраструктура** — таймаут `goto`, мережа;
   - **гонка в тесті** — не дочекалися стану;
   - **нестабільність застосунку** — як із меню, див. нижче.

---

## 11. Стабільність і відомі особливості

| Особливість | Причина | Як враховано |
|---|---|---|
| Подія `load` іноді затримується на 30 s і більше | сторонній ресурс на живому сайті | `goto` з `domcontentloaded` + очікування локатора |
| Після зміни URL видно старий вигляд | SPA-рендеринг | локатори обмежено контейнером сторінки, очікування специфічного елемента |
| Стан меню і фокус у ньому нестабільні | гонки в самому застосунку: `aria-hidden="false"` разом із `hidden`; подвійне перемикання від Space; фокус на мить потрапляє на кнопку, а потім на `<body>` | у menu-спеку `retries: 2` — такі прогони видно у звіті як **flaky**, а не приховано; поведінку описано в A11Y-003/004 |
| `opens with Space` іноді проходить | недетермінований результат подвійного перемикання (A11Y-004) | очікуваний flaky |
| WebKit пропускає посилання в Tab-послідовності | поведінка рушія | `test.skip` з причиною |
| `forced-colors` не емулюється у Firefox і WebKit | обмеження Playwright | `test.skip` з причиною |
| Знімки фокус-станів залежать від ОС | рендеринг шрифтів | еталони окремо для кожної платформи; `--ignore-snapshots` у CI до появи Linux-еталонів |

Типовий локальний `npm test`: близько 3–4 хв, 166 passed, 5 skipped, 0–1 flaky (Space у меню).
