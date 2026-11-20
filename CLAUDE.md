# CLAUDE.md

Цей файл — інструкції для Claude Code щодо роботи з цим репозиторієм.

## Про проєкт

Портфоліо-проєкт QA: автоматизоване тестування доступності (a11y) вебзастосунку
за допомогою **Playwright + @axe-core/playwright** з перевіркою на відповідність **WCAG 2.1 AA**.

- Об'єкт тестування: https://www.saucedemo.com (публічні демо-дані: `standard_user` / `secret_sauce`).
- Мета: показати вміння будувати фреймворк, а не просто викликати бібліотеку:
  фікстури, Page Objects, baseline відомих порушень, тести клавіатурної навігації,
  звітність і CI.
- План розробки поетапно описаний у `PLAN.md`. **Працюй строго по фазах.**

## Стек

- Node.js 22.18+ (скрипти `scripts/*.ts` запускаються нативно через type stripping), TypeScript (strict)
- `@playwright/test`, `@axe-core/playwright`
- ESLint (`typescript-eslint`, `eslint-plugin-playwright`) + Prettier
- GitHub Actions + GitHub Pages (публікація HTML-звіту)

## Команди

```bash
npm ci                         # встановлення залежностей
npx playwright install --with-deps chromium firefox webkit
npm test                       # усі тести
npm run test:a11y              # лише axe-сканування (tests/a11y)
npm run test:keyboard          # лише клавіатурні тести (tests/keyboard)
npm run test:headed            # з UI браузера
npm run report                 # відкрити HTML-звіт Playwright
npm run a11y:summary           # згенерувати reports/a11y-summary.md з JSON-результатів
npm run baseline:update        # перезаписати a11y-baseline.json поточними порушеннями
npm run pages:build            # зібрати site/ (індекс + HTML-звіт + зведення) для GitHub Pages
npm run lint                   # ESLint
npm run format                 # Prettier
npm run typecheck              # tsc --noEmit
```

Після будь-яких змін у коді запускай: `npm run typecheck && npm run lint && npm test`.

## Структура

```
.
├── CLAUDE.md
├── PLAN.md
├── README.md
├── A11Y-REPORT.md              # ручний звіт QA зі знайденими проблемами
├── a11y-baseline.json          # відомі порушення (rule id) по ключах сторінок/станів
├── playwright.config.ts
├── src/
│   ├── config/env.ts           # BASE_URL, облікові дані демо-юзера
│   ├── fixtures/pages.fixture.ts # фікстури Page Objects + loggedInPage
│   ├── a11y/
│   │   ├── axe.fixture.ts      # фікстура makeAxeBuilder + a11yScan
│   │   ├── scan.ts             # логіка сканування, фільтр за impact, attach у звіт
│   │   ├── baseline.ts         # читання/порівняння/оновлення baseline
│   │   ├── records.ts          # формат і читання reports/a11y-results/*.json
│   │   ├── format.ts           # людиночитне форматування порушень
│   │   ├── summary.ts          # агрегація сканувань → Markdown/HTML
│   │   └── pages-index.ts      # головна сторінка GitHub Pages
│   ├── keyboard/focus.ts       # хелпери: tabUntil, getFocusedElementInfo, isFocusVisible
│   └── pages/                  # Page Objects (LoginPage, InventoryPage, CartPage, ...)
├── tests/
│   ├── unit/                   # *.unit.spec.ts — unit-тести хелперів (проєкт `unit`)
│   ├── smoke/                  # *.smoke.spec.ts — шлях покупки через Page Objects
│   ├── a11y/                   # *.a11y.spec.ts — axe-сканування сторінок і станів (chromium + mobile-chromium)
│   ├── keyboard/               # *.keyboard.spec.ts — навігація з клавіатури
│   ├── media/                  # *.media.spec.ts — prefers-reduced-motion, forced-colors
│   ├── visual/                 # *.visual.spec.ts — фокус-стани (лише chromium), еталони в __screenshots__/<platform>
│   └── support/                # спільні expect-хелпери для тестів (не Page Objects)
├── scripts/                    # a11y-summary, baseline-update, build-pages, docs-screenshots
├── docs/images/                # скриншоти для README (node scripts/docs-screenshots.ts)
├── reports/                    # згенеровані артефакти (у .gitignore)
└── .github/workflows/a11y.yml
```

## Правила для a11y-тестів

- Завжди сканувати з тегами: `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`.
  Теги задаються **лише** у фікстурі, не в окремих тестах.
- Ніколи не створюй `new AxeBuilder(...)` напряму в тестах — тільки через фікстуру `a11yScan` / `makeAxeBuilder`.
- Кожне сканування має унікальний **ключ стану** (`scanKey`), напр. `login`, `login:error`,
  `inventory`, `inventory:menu-open`, `checkout-step-one:validation-errors`. Ключ — це зв'язок із baseline.
- Тест падає, якщо:
  - знайдено порушення з `impact` `critical` або `serious`, **якого немає в baseline** для цього ключа;
  - (м'яко) з'явилися нові `moderate`/`minor` — лише попередження в анотаціях, тест не падає.
- Порушення, що зникли з baseline, позначай анотацією `fixed-since-baseline` (не падати).
- Повні результати axe завжди прикріплювати до звіту через `testInfo.attach` (JSON) і
  записувати в `reports/a11y-results/<scanKey>.json`.
- Сканувати **стан після дії** тільки після того, як UI стабілізувався:
  чекай на конкретний локатор (`await expect(locator).toBeVisible()`), **не** `waitForTimeout`.
- Сторонні віджети/рекламу виключати через `.exclude()` у Page Object, а не в тесті.
- Не вимикай правила (`disableRules`) без коментаря з причиною і посиланням на issue в A11Y-REPORT.md.

## Правила для клавіатурних тестів

- Перевіряти: порядок Tab, видимість фокуса, доступність усіх інтерактивних елементів із клавіатури,
  відкриття/закриття меню (Enter/Space/Escape), відсутність keyboard trap.
- Для визначення фокусу використовуй хелпери з `src/keyboard/focus.ts`, не дублюй `page.evaluate`.
- Якщо поведінка застосунку — реальний баг доступності, тест позначай `test.fail()` з коментарем
  та ID проблеми з A11Y-REPORT.md (напр. `// A11Y-004`). Не підганяй тест під баг мовчки.

## Конвенції коду

- TypeScript strict, без `any` (виняток — типи axe, які вже є в `axe-core`).
- Локатори: пріоритет `getByRole` → `getByLabel` → `getByTestId` (`data-test` на saucedemo) → CSS.
  Налаштуй `testIdAttribute: 'data-test'` у конфігу.
- Page Objects: тільки локатори й дії, **без** `expect` всередині.
- Назви тестів — англійською, у форматі: `login page › has no new serious violations`.
- Жодних `waitForTimeout`, жодних `test.only` у коміті.
- Секрети не потрібні; облікові дані демо-юзера — у `src/config/env.ts` з можливістю перевизначити через env.
- Коментарі в коді — англійською. Документація (README, A11Y-REPORT) — українською з англійськими термінами WCAG.

## Робочий процес

1. Перед початком фази прочитай відповідну секцію `PLAN.md`.
2. Виконуй тільки поточну фазу; не забігай уперед.
3. Після завершення: прогони `typecheck`, `lint`, `test`; переконайся, що критерії приймання фази виконані.
4. Відміть чекбокси фази в `PLAN.md` як виконані.
5. Зроби коміт у форматі Conventional Commits: `feat(a11y): ...`, `test(keyboard): ...`, `ci: ...`, `docs: ...`.
6. Коротко підсумуй, що зроблено, і що буде в наступній фазі.

## Чого не робити

- Не змінювати `a11y-baseline.json` вручну, щоб «позеленити» тест — тільки через `npm run baseline:update`
  і з поясненням у коміті.
- Не послаблювати теги WCAG чи поріг impact заради проходження тестів.
- Не додавати залежності без потреби; кожну нову — обґрунтувати в описі коміту.
- Не комітити `reports/`, `playwright-report/`, `test-results/`.
