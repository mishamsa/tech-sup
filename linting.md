# Статичний аналіз коду — документація

## 1. Обраний лінтер та причини вибору

### ESLint (для JavaScript)

**Версія:** 9.x (Flat Config)  
**Офіційний сайт:** https://eslint.org

**Чому ESLint:**

| Критерій | ESLint | JSHint | StandardJS |
|----------|--------|--------|------------|
| Гнучкість конфігурації | ✅ Висока | ⚠ Середня | ❌ Жорстка |
| Екосистема плагінів | ✅ Тисячі | ❌ Мало | ⚠ Обмежена |
| Підтримка ES2022+ | ✅ | ⚠ | ✅ |
| Автовиправлення (`--fix`) | ✅ | ❌ | ✅ |
| Активна підтримка | ✅ | ❌ Заморожений | ✅ |
| Інтеграція з IDE | ✅ Відмінна | ⚠ | ✅ |

ESLint обрано як **галузевий стандарт** для JS-проєктів: він підтримується командою OpenJS Foundation, має найширшу екосистему та дозволяє точно налаштовувати правила під потреби конкретного проєкту.

---

### Stylelint (для CSS)

**Версія:** 16.x  
**Офіційний сайт:** https://stylelint.io

Обрано для аналізу CSS у `<style>`-блоках та окремих `.css`-файлах. Забезпечує консистентність кольорів (CSS-змінні), одиниць вимірювання та селекторів.

---

## 2. Структура конфігураційних файлів

```
tournament-landing/
├── eslint.config.js       ← головна конфігурація ESLint (Flat Config v9)
├── .eslintignore           ← файли/директорії, що виключаються з перевірки
├── .stylelintrc.json       ← конфігурація Stylelint для CSS
├── package.json            ← npm-скрипти для запуску лінтерів
├── src/
│   ├── tournament.js       ← ✅ виправлений JS-код
│   └── animations.js       ← ✅ модуль анімацій
└── docs/
    └── linting.md          ← ця документація
```

---

## 3. Правила ESLint та їх пояснення

### Стиль коду

| Правило | Налаштування | Пояснення |
|---------|-------------|-----------|
| `indent` | `error`, 2 пробіли | Уніфікований відступ у всьому проєкті |
| `quotes` | `error`, single | Одинарні лапки — стандарт для JS-проєктів |
| `semi` | `error`, always | Крапка з комою обов'язкова — уникнення ASI-помилок |
| `comma-dangle` | `error`, always-multiline | Кома після останнього елемента — чистіші git diff |
| `eol-last` | `error` | Порожній рядок наприкінці файлу (POSIX-стандарт) |
| `no-trailing-spaces` | `error` | Видалення «сміттєвих» пробілів |
| `max-len` | `warn`, 100 символів | Обмеження довжини рядка для читабельності |

### Якість та безпека

| Правило | Налаштування | Пояснення |
|---------|-------------|-----------|
| `no-var` | `error` | Заборона `var` — використовувати лише `const`/`let` |
| `prefer-const` | `error` | `const` де змінна не переприсвоюється |
| `eqeqeq` | `error`, always | Суворе порівняння `===` замість `==` |
| `no-unused-vars` | `error` | Видалення мертвого коду |
| `no-console` | `warn` | Попередження про залишені `console.log` |
| `curly` | `error`, all | Фігурні дужки обов'язкові — запобігання помилкам |
| `no-else-return` | `error` | Зайвий `else` після `return` — спрощення коду |
| `prefer-template` | `error` | Шаблонні рядки замість конкатенації `+` |
| `no-param-reassign` | `warn` | Уникати мутації параметрів функції |
| `complexity` | `warn`, max 10 | Обмеження цикломатичної складності |

### CSS (Stylelint)

| Правило | Пояснення |
|---------|-----------|
| `color-named` | Заборона іменованих кольорів (`red`, `blue`) — тільки CSS-змінні або hex |
| `selector-max-id` | 0 — заборона `#id` в CSS, тільки класи |
| `property-no-vendor-prefix` | Більшість вендорних префіксів зайві у 2024 році |
| `unit-allowed-list` | Дозволений список одиниць — запобігає використанню застарілих `cm`, `pt` |

---

## 4. Виправлені проблеми (коміт `fix: resolve eslint errors`)

### Проблема 1 — `var` замість `const`/`let`

**Файл:** `src/tournament.js`  
**Правила:** `no-var`, `prefer-const`

```js
// ❌ До виправлення
var BASE_URL = 'https://api.tournament.ua/v1'
var maxRounds = 7

// ✅ Після виправлення
const BASE_URL = 'https://api.tournament.ua/v1';
const MAX_ROUNDS = 7;
```

**Чому важливо:** `var` має функціональну область видимості та піднімається (hoisting), що призводить до непередбачуваної поведінки. `const`/`let` мають блочну область — поведінка передбачувана.

---

### Проблема 2 — Нестрогі порівняння `==`

**Файл:** `src/tournament.js`  
**Правило:** `eqeqeq`

```js
// ❌ До виправлення
if (status == 'active') { ... }
if (response.ok == false) { ... }
if (round.completed == true) { ... }

// ✅ Після виправлення
if (status === 'active') { ... }
if (response.ok === false) { ... }
if (round.completed === true) { ... }
```

**Чому важливо:** `==` виконує неявне приведення типів: `0 == false` → `true`, `'' == false` → `true`, `null == undefined` → `true`. Це джерело тонких багів.

---

### Проблема 3 — Конкатенація рядків замість шаблонних літералів

**Файл:** `src/tournament.js`  
**Правило:** `prefer-template`

```js
// ❌ До виправлення
return fetch(BASE_URL + '/tournaments/' + id)

// ✅ Після виправлення
return fetch(`${BASE_URL}/tournaments/${id}`)
```

**Чому важливо:** Шаблонні рядки читабельніші, не потребують конкатенації та підтримують багаторядкові вирази без `\n`.

---

### Проблема 4 — Відсутність фігурних дужок в `if`

**Файл:** `src/tournament.js`  
**Правило:** `curly`

```js
// ❌ До виправлення
if (round.completed == true)
  return round.results

// ✅ Після виправлення
if (round.completed === true) {
  return round.results;
}
```

**Чому важливо:** Відомий «Apple SSL bug» (CVE-2014-1266) — критична вразливість у безпеці — виникла саме через відсутність фігурних дужок.

---

### Проблема 5 — Невикористана змінна

**Файл:** `src/tournament.js`  
**Правило:** `no-unused-vars`

```js
// ❌ До виправлення
const unusedVariable = 'I am never used'

// ✅ Після виправлення
// — рядок повністю видалено
```

**Чому важливо:** Мертвий код ускладнює читання та підтримку, збільшує розмір бандлу.

---

## 5. Симульований вивід лінтера (до виправлень)

```
$ npm run lint

> tournament-landing@1.0.0 lint
> eslint src/**/*.js

src/tournament.before-fix.js
   4:1   error    Unexpected var, use let or const instead            no-var
   5:1   error    Unexpected var, use let or const instead            no-var
   9:7   error    Expected '===' and instead saw '=='                 eqeqeq
  14:3   warning  Unexpected console statement                        no-console
  15:10  error    Unexpected string concatenation                     prefer-template
  17:7   error    Expected '===' and instead saw '=='                 eqeqeq
  24:1   error    'unusedVariable' is assigned a value but never used no-unused-vars
  28:3   error    Expected { after 'if' condition                     curly
  28:7   error    Expected '===' and instead saw '=='                 eqeqeq
  31:21  warning  Unexpected function expression                      prefer-arrow-callback
  37:3   warning  Assignment to function parameter 'player'           no-param-reassign
  38:3   warning  Assignment to function parameter 'player'           no-param-reassign

✖ 8 errors, 4 warnings found.
  Run eslint --fix to fix 5 of these automatically.
```

---

## 6. Інструкція з запуску лінтера

### Встановлення залежностей

```bash
# Клонувати репозиторій
git clone https://github.com/username/tournament-landing.git
cd tournament-landing

# Встановити залежності
npm install
```

### Доступні команди

```bash
# Перевірити JS-файли
npm run lint

# Перевірити та автоматично виправити JS
npm run lint:fix

# Перевірити CSS
npm run lint:css

# Виправити CSS
npm run lint:css:fix

# Перевірити все (JS + CSS)
npm run lint:all

# Згенерувати HTML-звіт
npm run lint:report
# → відкрити reports/eslint-report.html
```

### Запуск напряму через npx

```bash
# Перевірити один файл
npx eslint src/tournament.js

# Перевірити з деталями правил
npx eslint src/tournament.js --rule '{"semi": "error"}'

# Перевірити та показати лише помилки (без попереджень)
npx eslint src/ --quiet

# Перевірити CSS
npx stylelint "**/*.css"
```

### Інтеграція з редактором коду

**VS Code** — встановити розширення:
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) (`dbaeumer.vscode-eslint`)
- [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)

Додати до `.vscode/settings.json`:
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript"],
  "stylelint.validate": ["css", "html"]
}
```

**WebStorm / IntelliJ IDEA** — ESLint вбудований, достатньо вказати шлях до `eslint.config.js` у _Settings → Languages → JavaScript → Code Quality Tools → ESLint_.

---

## 7. Інтеграція в CI/CD (GitHub Actions)

```yaml
# .github/workflows/lint.yml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint:all
```

---

## 8. Посилання

- [ESLint — офіційна документація](https://eslint.org/docs/latest/)
- [ESLint Rules Reference](https://eslint.org/docs/latest/rules/)
- [Stylelint — документація](https://stylelint.io/user-guide/configure/)
- [Flat Config Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)
