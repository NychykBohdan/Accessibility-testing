# PLAN.md — план розробки

Проєкт: a11y-тестування saucedemo.com за допомогою Playwright + axe-core.
Як працювати з Claude Code: «Виконай фазу N з PLAN.md». Одна фаза = один або кілька комітів.

---

## Фаза 0. Ініціалізація репозиторію

- [x] `npm init`, TypeScript (strict), `@playwright/test`, `@axe-core/playwright`
- [x] `playwright.config.ts`: `baseURL` з env (`BASE_URL`, дефолт saucedemo), `testIdAttribute: 'data-test'`,
      проєкти `chromium`, `firefox`, `webkit`, репортери `html` + `list` + `json` (`reports/results.json`),
      `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`
- [x] ESLint (`typescript-eslint`, `eslint-plugin-playwright`), Prettier, `.editorconfig`
- [x] npm-скрипти з CLAUDE.md (поки що заглушки для `a11y:summary` і `baseline:update`)
- [x] `.gitignore`: `node_modules`, `reports`, `playwright-report`, `test-results`
- [x] `src/config/env.ts`
- [x] Smoke-тест: сторінка логіну відкривається

**Критерії приймання:** `npm run typecheck && npm run lint && npm test` проходять у всіх трьох браузерах.

---

## Фаза 1. Page Objects

- [x] `LoginPage` (поля, кнопка, повідомлення про помилку, `login(user, pass)`)
- [x] `InventoryPage` (список товарів, сортування, кнопка бургер-меню, меню, кошик)
- [x] `ItemPage`, `CartPage`, `CheckoutStepOnePage`, `CheckoutStepTwoPage`, `CheckoutCompletePage`
- [x] Фікстура `loggedInPage` (логін через UI один раз; за можливості — `storageState`)

**Критерії:** smoke-тест проходить повний шлях покупки через Page Objects.

---

## Фаза 2. Ядро a11y: фікстура, сканування, форматування

- [x] `src/a11y/axe.fixture.ts`: фікстура `makeAxeBuilder()` з тегами WCAG 2.1 AA
- [x] `src/a11y/scan.ts`: `a11yScan(page, scanKey, { include?, exclude? })` →
      запускає axe, групує порушення за impact, прикріплює JSON до звіту,
      пише `reports/a11y-results/<scanKey>.json`
- [x] `src/a11y/format.ts`: людиночитний вивід (rule id, impact, help, helpUrl, перші 3 target-селектори)
      для повідомлень у `expect` та анотацій
- [x] Unit-тести для `format.ts` (на фіксованому JSON axe)

**Критерії:** тестовий скан сторінки логіну створює JSON-файл і вкладення у HTML-звіті.

---

## Фаза 3. Baseline відомих порушень

- [ ] `src/a11y/baseline.ts`: формат `{ [scanKey]: string[] /* rule ids */ }`
- [ ] Логіка порівняння: `new` (немає в baseline), `known`, `fixed` (є в baseline, але зникли)
- [ ] Тест падає лише на `new` з impact `critical`/`serious`; `moderate`/`minor` → анотація `warning`;
      `fixed` → анотація `fixed-since-baseline`
- [ ] Режим `UPDATE_A11Y_BASELINE=1` (скрипт `baseline:update`) — перезаписує baseline,
      запускаючи сканування лише в chromium, з детермінованим сортуванням
- [ ] Unit-тести для порівняння baseline

**Критерії:** після `baseline:update` усі a11y-тести зелені; штучно додане порушення
(напр. `<img>` без alt через `page.evaluate`) у окремому тесті-доказі робить скан червоним.

---

## Фаза 4. Сканування сторінок

`tests/a11y/pages.a11y.spec.ts` — по одному тесту на сторінку:

- [ ] `login`
- [ ] `inventory`
- [ ] `item`
- [ ] `cart` (з товаром)
- [ ] `checkout-step-one`
- [ ] `checkout-step-two`
- [ ] `checkout-complete`

**Критерії:** 7 сканувань, усі ключі є в baseline, звіт містить JSON для кожного.

---

## Фаза 5. Сканування станів UI

`tests/a11y/states.a11y.spec.ts`:

- [ ] `login:error` — порожня форма / неправильний пароль
- [ ] `login:locked-user` — `locked_out_user`
- [ ] `inventory:menu-open` — відкрите бургер-меню (скан тільки меню через `include`)
- [ ] `inventory:sorted` — після зміни сортування
- [ ] `checkout-step-one:validation-errors`
- [ ] `cart:empty`

**Критерії:** кожен стан чекає на конкретний локатор перед сканом; жодного `waitForTimeout`.

---

## Фаза 6. Клавіатурна навігація

- [ ] `src/keyboard/focus.ts`: `getFocusedElementInfo()` (role, accessible name, data-test),
      `tabUntil(predicate, maxSteps)`, `isFocusVisible()` (outline/box-shadow у computed style)
- [ ] `login.keyboard.spec.ts`: Tab-порядок username → password → login; вхід лише клавіатурою (Enter)
- [ ] `inventory.keyboard.spec.ts`: додати товар у кошик з клавіатури; дістатися до кошика
- [ ] `menu.keyboard.spec.ts`: відкрити меню Enter/Space, перевірити фокус усередині, закрити Escape,
      фокус повертається на кнопку меню; немає keyboard trap
- [ ] `checkout.keyboard.spec.ts`: пройти checkout повністю без миші
- [ ] Видимість фокуса на кожному кроці
- [ ] Реальні баги → `test.fail()` + ID з A11Y-REPORT.md

**Критерії:** усі сценарії або проходять, або позначені `test.fail()` з посиланням на задокументовану проблему.

---

## Фаза 7. Звітність

- [ ] `scripts/a11y-summary.ts`: читає `reports/a11y-results/*.json` →
      `reports/a11y-summary.md`: таблиця scanKey × (critical / serious / moderate / minor),
      топ-правил за кількістю, посилання на helpUrl
- [ ] Вивід зведення в `$GITHUB_STEP_SUMMARY`, якщо змінна доступна
- [ ] Індексна HTML-сторінка для GitHub Pages: посилання на HTML-звіт Playwright і зведення

**Критерії:** `npm test && npm run a11y:summary` локально генерує коректне зведення.

---

## Фаза 8. CI/CD

`.github/workflows/a11y.yml`:

- [ ] Тригери: `push`, `pull_request`, `workflow_dispatch`, щотижневий `schedule`
- [ ] Job `lint`: typecheck + lint
- [ ] Job `test`: matrix за браузерами, кеш npm, `npx playwright install --with-deps <browser>`
- [ ] Артефакти: `playwright-report`, `reports/` (retention 14 днів)
- [ ] Job `summary`: зведення в Job Summary
- [ ] Job `deploy-report` (тільки для `main`): `actions/upload-pages-artifact` + `actions/deploy-pages`,
      `permissions: pages: write, id-token: write`

**Критерії:** pipeline зелений на `main`, звіт доступний на GitHub Pages, бейдж статусу працює.

---

## Фаза 9. Документація для портфоліо

- [ ] `README.md`: мета, стек, архітектура (дерево + коротко про baseline), як запустити,
      скриншот звіту, бейдж CI, посилання на GitHub Pages, «Що я б додав далі»
- [ ] `A11Y-REPORT.md`: 5–10 знайдених проблем у форматі:
      ID (A11Y-001…), сторінка/стан, опис, критерій WCAG (напр. 1.4.3 Contrast (Minimum)),
      кого зачіпає, кроки відтворення, очікуваний vs фактичний результат, рекомендація з виправлення,
      severity, джерело (axe / ручна перевірка / клавіатура)
- [ ] Розділ про обмеження автоматизації: axe знаходить лише частину проблем; що перевірено вручну
      (скрінрідер NVDA/VoiceOver — коротко, якщо робилося)

**Критерії:** незнайома людина може клонувати репо й запустити тести за інструкцією з README за 5 хвилин.

---

## Фаза 10 (опційно). Розширення

- [ ] Сканування на мобільному в'юпорті (`devices['iPhone 13']`)
- [ ] Перевірка режиму `prefers-reduced-motion` та `forced-colors`
- [ ] Візуальне порівняння фокус-станів (`toHaveScreenshot`) для ключових елементів
- [ ] Окремий проєкт для другого сайту з навмисно поганою доступністю для порівняння
