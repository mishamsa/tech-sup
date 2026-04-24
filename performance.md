# Профілювання продуктивності — tournament-landing

## Зміст

1. [Огляд проєкту](#1-огляд-проєкту)
2. [Інструменти профілювання](#2-інструменти-профілювання)
3. [Ключові метрики продуктивності](#3-ключові-метрики-продуктивності)
4. [Тестові сценарії](#4-тестові-сценарії)
5. [Методологія](#5-методологія)
6. [Результати базового профілювання](#6-результати-базового-профілювання)
7. [Виявлені гарячі точки](#7-виявлені-гарячі-точки)
8. [Аналіз проблем та рекомендації](#8-аналіз-проблем-та-рекомендації)
9. [Запуск профілювання](#9-запуск-профілювання)

---

## 1. Огляд проєкту

**Назва:** tournament-landing  
**Тип:** Браузерний JavaScript-застосунок (ES2022, без фреймворків)  
**Мова:** JavaScript (ES Modules)  
**Середовище виконання:** Chromium-браузери / Node.js (для тестів)

### Ключові модулі

| Модуль | Призначення |
|--------|-------------|
| `src/animations.js` | Fade-in анімації через IntersectionObserver; sticky-навігація |
| `src/logger.js` | Багаторівнева система логування з транспортами |
| `src/logger.config.js` | Конфігурація логера; remote-транспорт для продакшну |
| `src/tournament.js` | Бізнес-логіка: статуси, fetch-запити, обробка результатів |
| `index.html` | Точка входу (40 KB, вбудований CSS/JS) |

---

## 2. Інструменти профілювання

### CPU-профілювання

| Інструмент | Застосування |
|-----------|--------------|
| **Chrome DevTools → Performance** | Запис flame graph під час взаємодії з UI; виявлення довгих задач (Long Tasks > 50 ms) |
| **Chrome DevTools → Lighthouse** | Аудит Core Web Vitals: LCP, FID/INP, CLS, TTFB |
| **Node.js `--prof` + `--prof-process`** | Збір V8-профілю при запуску тестів: `node --prof tests/performance.test.js` |
| **`performance.now()`** | Мікробенчмарки окремих функцій (вбудований у тест-скрипт) |

**Приклад запуску CPU-профілю в Node.js:**
```bash
node --prof tests/performance.test.js
node --prof-process isolate-*.log > cpu-profile.txt
```

### Моніторинг пам'яті

| Інструмент | Застосування |
|-----------|--------------|
| **Chrome DevTools → Memory** | Heap snapshot; виявлення витоків через Allocation Timeline |
| **Chrome DevTools → Performance Monitor** | Реальний графік JS Heap Size під час навігації |
| **Node.js `process.memoryUsage()`** | Програмне вимірювання RSS / heapUsed в тестах |
| **`--heap-prof`** | Sampling heap profiler: `node --heap-prof tests/performance.test.js` |

**Вимірювання пам'яті в тестах:**
```js
const before = process.memoryUsage().heapUsed;
// ... код, що тестується ...
const delta = process.memoryUsage().heapUsed - before;
console.log(`Heap delta: ${(delta / 1024).toFixed(1)} KB`);
```

### Профілювання мережевих запитів

Проєкт виконує REST-запити до `https://api.tournament.ua/v1`.

| Інструмент | Застосування |
|-----------|--------------|
| **Chrome DevTools → Network** | Waterfall; TTFB; розмір відповіді; кешування |
| **Lighthouse → Network** | Аудит розміру ресурсів, зайвих запитів |
| **`performance.getEntriesByType('resource')`** | Програмний збір PerformanceResourceTiming |

> **Примітка:** Пряме профілювання БД не застосовне — застосунок є front-end SPA без прямого доступу до бази даних. Взаємодія відбувається через REST API.

---

## 3. Ключові метрики продуктивності

### Core Web Vitals (браузер)

| Метрика | Опис | Ціль |
|---------|------|------|
| **LCP** (Largest Contentful Paint) | Час до відрисовки найбільшого елемента | < 2.5 s |
| **INP** (Interaction to Next Paint) | Затримка реакції на взаємодію | < 200 ms |
| **CLS** (Cumulative Layout Shift) | Зсув макету під час завантаження | < 0.1 |
| **FCP** (First Contentful Paint) | Перший корисний піксель | < 1.8 s |
| **TTFB** (Time to First Byte) | Час відповіді сервера | < 600 ms |

### JavaScript-метрики (вимірювані тестами)

| Метрика | Опис |
|---------|------|
| **initFadeInObserver() latency** | Час реєстрації N елементів в IntersectionObserver |
| **logger.warn() throughput** | Кількість записів на секунду при мінімальному рівні WARN |
| **checkStatus() latency** | Час перевірки статусу одного запису |
| **Array filter+map latency** | Час обробки 100 раундів (реальний розмір датасету) |
| **URL-побудова latency** | Overhead шаблонних рядків для кожного fetch-запиту |

### Метрики пам'яті

| Метрика | Опис |
|---------|------|
| **Heap delta per Observer** | Приріст купи на один IntersectionObserver (очікується < 10 KB) |
| **Logger instance size** | Розмір екземпляра Logger + транспорти |
| **Memory after 1000 log calls** | Відсутність витоків у черзі логів |

---

## 4. Тестові сценарії

Всі сценарії реалізовані у `tests/performance.test.js`.

### Сценарій 1: DOM — ініціалізація анімацій
**Опис:** `querySelectorAll('.fade-in')` (50 елементів) + реєстрація в `IntersectionObserver`.  
**Обґрунтування:** Виконується при кожному DOMContentLoaded; деградація при великій кількості анімованих елементів.  
**Ітерацій:** 500

### Сценарій 2: Logger — форматування рядка запису
**Опис:** Побудова рядка лога з timestamp, рівнем, модулем та повідомленням; перевірка фільтра рівня.  
**Обґрунтування:** Виклик logger відбувається в hot-path (кожен API-запит, кожна помилка).  
**Ітерацій:** 5 000

### Сценарій 3: tournament — `checkStatus()`
**Опис:** Перевірка статусу рядка рядком (`=== 'active'`).  
**Обґрунтування:** Базова функція; показує overhead чистої логіки без DOM/мережі.  
**Ітерацій:** 10 000

### Сценарій 4: tournament — побудова URL + заголовків
**Опис:** Template literal `${BASE_URL}/tournaments/${id}` + об'єкт headers.  
**Обґрунтування:** Виконується перед кожним `fetch()`; оцінює overhead шаблонних рядків.  
**Ітерацій:** 10 000

### Сценарій 5: tournament — filter + map масиву раундів
**Опис:** `.filter(r => r.completed === true).map(r => ({ id, avgScore }))` на 100 раундах.  
**Обґрунтування:** Реальний розмір датасету; виявляє лінійну складність обробки.  
**Ітерацій:** 1 000

### Сценарій 6: DOM — масовий observe/unobserve (200 елементів)
**Опис:** Повний цикл `observe()` × 200 + `unobserve()` × 200 + `disconnect()`.  
**Обґрунтування:** Моделює SPA-навігацію зі знищенням спостерігачів при виході зі сторінки.  
**Ітерацій:** 500

---

## 5. Методологія

### Умови вимірювання

- **Середовище:** Node.js 20+ (V8 engine), однопотоковий запуск.
- **Прогрів (warmup):** 5 ітерацій перед вимірюванням — дозволяє JIT-компілятору оптимізувати гарячий код.
- **Таймер:** `performance.now()` з роздільною здатністю < 0.1 мс.
- **Ізоляція:** Кожен сценарій вимірюється незалежно; між сценаріями GC не форсується навмисно (реалістичне середовище).

### Метрики, що збираються

- **avgMs** — середнє за N ітерацій (основна метрика).
- **minMs** — мінімум (найкращий випадок, без GC-пауз).
- **maxMs** — максимум (відображає GC-паузи та системні переривання).
- **totalMs** — загальний час (для оцінки throughput).

### Обмеження

1. Node.js не має реального DOM; `querySelectorAll` та `IntersectionObserver` замінено моками — абсолютні значення менші за браузерні.
2. Мережеві запити (`fetch`) не профілюються в ізольованих тестах — відсутність реального сервера.
3. V8 у Node.js може відрізнятись від V8 у Chromium за точками оптимізації.

---

## 6. Результати базового профілювання

*Виміряно: Node.js v20+, Linux x64. Дата: квітень 2026.*

| Сценарій | Ітер. | Сер. (ms) | Мін. (ms) | Макс. (ms) |
|----------|------:|----------:|----------:|-----------:|
| DOM: querySelectorAll(50) + observe | 500 | **0.0199** | 0.0063 | 0.7617 |
| Logger: форматування рядка запису | 5 000 | 0.0014 | 0.0007 | 0.8149 |
| tournament: checkStatus() | 10 000 | 0.0001 | 0.0001 | 0.0361 |
| tournament: побудова URL + headers | 10 000 | 0.0003 | 0.0001 | 0.5010 |
| tournament: filter + map (100 раундів) | 1 000 | **0.0075** | 0.0024 | 0.9056 |
| DOM: observe+unobserve (200 елементів) | 500 | **0.0148** | 0.0089 | 0.7611 |

### Інтерпретація

- Всі операції виконуються **менш ніж за 0.02 мс** у середньому — прийнятно для 60 fps (бюджет ~16.7 ms на кадр).
- Максимальні значення (0.5–0.9 ms) відображають GC-паузи та не є систематичними.
- `checkStatus()` та побудова URL — практично безкоштовні операції (< 0.001 ms avg).

---

## 7. Виявлені гарячі точки

### 🔥 Гаряча точка #1 — DOM: querySelectorAll + IntersectionObserver.observe

**Функція:** `initFadeInObserver()` → `document.querySelectorAll()` + `observer.observe()`  
**Середній час:** 0.0199 ms (найповільніший у тестах)  
**Причина:** DOM-обхід є найдорожчою операцією у браузерному середовищі. При 50+ анімованих елементах сумарний час реєстрації зростає лінійно. У реальному браузері це ще дорожче через перерахунок стилів.

**Приклад коду (гарячий шлях):**
```js
// src/animations.js — рядок 22–24
document.querySelectorAll(selector).forEach((el) => {
  observer.observe(el);  // ← виклик для кожного елемента
});
```

**Рекомендація:** Обмежити кількість анімованих елементів до 20–30. Розглянути `requestAnimationFrame` для батчингу реєстрацій.

---

### 🔥 Гаряча точка #2 — DOM: масовий observe/unobserve при навігації

**Функція:** Очищення Observer при переході між секціями (200 елементів)  
**Середній час:** 0.0148 ms  
**Причина:** SPA-навігація вимагає `disconnect()` старих спостерігачів та реєстрації нових. При 200+ елементах це створює помітний spike у flame graph.

**Рекомендація:** Використовувати єдиний `IntersectionObserver` для всього документа замість окремого per-секція. Lazy-ініціалізація лише для видимої секції.

---

### 🔥 Гаряча точка #3 — tournament: filter + map масиву результатів

**Функція:** Фільтрація завершених раундів + обчислення середнього балу  
**Середній час:** 0.0075 ms (на 100 раундах)  
**Причина:** При зростанні датасету (наприклад, 1 000 раундів у реальному турнірі) час зросте до ~0.075 ms на операцію. Якщо виклик відбувається в циклі render, це може перевищити бюджет кадру.

**Приклад коду:**
```js
// src/tournament.js
const completed = mockRounds
  .filter((r) => r.completed === true)   // O(n)
  .map((r) => ({                          // O(n)
    id:       r.id,
    avgScore: r.results.reduce(...)       // O(m) для кожного раунду
  }));
```

**Рекомендація:** Кешувати результат обчислення між рендерами. Перейти на `reduce()` замість `filter + map` для уникнення подвійного проходу.

---

## 8. Аналіз проблем та рекомендації

### 8.1 Відсутність дебаунсу на scroll-обробнику

**Файл:** `src/animations.js`, функція `initStickyNav()`  
**Проблема:** `handleScroll` викликається при кожній події `scroll` (до 60 разів/с). Хоча прапор `{ passive: true }` встановлено, DOM-мутація (`classList.add/remove('scrolled')`) в кожному виклику може викликати layout thrashing.

```js
// Поточний код — без дебаунсу
window.addEventListener('scroll', handleScroll, { passive: true });
```

**Рекомендація:**
```js
let rafId = null;
const handleScroll = () => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
    rafId = null;
  });
};
```

### 8.2 Logger — синхронний remote transport

**Файл:** `src/logger.config.js`  
**Проблема:** `navigator.sendBeacon()` викликається синхронно у функції-транспорті. При high-frequency логуванні (наприклад, у циклі обробки матчів) можливе накопичення черги beacon-запитів.

**Рекомендація:** Реалізувати батчинг: накопичувати записи та відправляти пакетами кожні 5 секунд або по 100 записів.

### 8.3 Розмір index.html

**Файл:** `index.html` (~40 KB)  
**Проблема:** Увесь CSS та JS вбудовано inline. Це унеможливлює кешування та паралельне завантаження.

**Рекомендація:** Виокремити CSS у `<link rel="stylesheet">` та JS у `<script src>` з атрибутом `defer`. Розглянути code splitting через Vite або Rollup.

### 8.4 Немає мемоізації в `fetchTournaments`

**Файл:** `src/tournament.js`  
**Проблема:** Кожен виклик `fetchTournaments(id)` з однаковим `id` виконує новий мережевий запит.

**Рекомендація:** Додати простий `Map`-кеш з TTL (time-to-live 30 s):
```js
const cache = new Map();
function fetchTournaments(id) {
  const cached = cache.get(id);
  if (cached && Date.now() - cached.ts < 30_000) return Promise.resolve(cached.data);
  return fetch(`${BASE_URL}/tournaments/${id}`)
    .then((r) => r.json())
    .then((data) => { cache.set(id, { data, ts: Date.now() }); return data; });
}
```

---

## 9. Запуск профілювання

### Автоматизовані тести

```bash
# Запуск бенчмарків (вивід у термінал + JSON-звіт)
node tests/performance.test.js

# CPU-профіль через V8 (генерує isolate-*.log)
node --prof tests/performance.test.js
node --prof-process isolate-*.log > reports/cpu-profile.txt

# Heap-профіль
node --heap-prof tests/performance.test.js
# → генерує Heap.*.heapprofile — відкрити у Chrome DevTools
```

### Браузерне профілювання (Lighthouse)

```bash
# Потрібен локальний сервер
npx http-server . -p 8080 &

# Lighthouse CLI
npx lighthouse http://localhost:8080 \
  --output=html \
  --output-path=reports/lighthouse.html \
  --preset=desktop
```

### Читання JSON-звіту

```bash
# Останній запуск тестів
cat tests/performance-report.json | node -e "
  const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  r.results.forEach(x => console.log(x.name, '->', x.avgMs, 'ms avg'));
"
```

---

*Документ підготовлено в рамках завдання з профілювання продуктивності браузерного JavaScript-застосунку.*  
*Автор: mishamsa | Дата: квітень 2026*
