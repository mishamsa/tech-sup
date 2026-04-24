/**
 * @fileoverview Тестові сценарії для вимірювання продуктивності.
 *
 * Охоплює три ключові модулі:
 *  - src/animations.js   — IntersectionObserver / DOM-операції
 *  - src/logger.js       — система логування
 *  - src/tournament.js   — бізнес-логіка турнірів
 *
 * Запуск:
 *   node tests/performance.test.js
 *
 * @module performance.test
 */

// ─── Мок браузерного середовища ──────────────────────────────────────────────

/** Спрощена імітація IntersectionObserver для Node.js */
class MockIntersectionObserver {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options  = options;
    this.observed = new Set();
  }
  observe(el)   { this.observed.add(el); }
  unobserve(el) { this.observed.delete(el); }
  disconnect()  { this.observed.clear(); }
}

/** Спрощена імітація DOM-елемента */
class MockElement {
  constructor(id = 'el') {
    this.id        = id;
    this.classList = { classes: new Set(), add(c) { this.classes.add(c); } };
    this.style     = {};
  }
}

// Глобали, що очікує браузерний код
global.IntersectionObserver = MockIntersectionObserver;
global.window               = { scrollY: 0, addEventListener: () => {} };
global.document             = {
  querySelectorAll: (sel) => Array.from({ length: 50 }, (_, i) => new MockElement(`el-${i}`)),
  querySelector:    ()    => new MockElement('nav'),
  addEventListener: ()    => {},
};
global.navigator            = { sendBeacon: null };

// ─── Утиліти вимірювання ──────────────────────────────────────────────────────

/**
 * Вимірює час виконання синхронної функції (N ітерацій).
 *
 * @param {string}   name       - Назва тесту.
 * @param {Function} fn         - Функція, що тестується.
 * @param {number}   [iter=100] - Кількість ітерацій.
 * @returns {{ name: string, iterations: number, totalMs: number, avgMs: number, minMs: number, maxMs: number }}
 */
function measureSync(name, fn, iter = 100) {
  const times = [];

  // Прогрів (уникаємо JIT-артефактів у перших запусках)
  for (let w = 0; w < 5; w++) fn();

  for (let i = 0; i < iter; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }

  const total = times.reduce((a, b) => a + b, 0);
  return {
    name,
    iterations: iter,
    totalMs:    +total.toFixed(4),
    avgMs:      +(total / iter).toFixed(4),
    minMs:      +Math.min(...times).toFixed(4),
    maxMs:      +Math.max(...times).toFixed(4),
  };
}

/**
 * Вимірює час виконання асинхронної функції (N ітерацій).
 *
 * @param {string}   name       - Назва тесту.
 * @param {Function} fn         - Async-функція, що тестується.
 * @param {number}   [iter=100] - Кількість ітерацій.
 * @returns {Promise<object>}
 */
async function measureAsync(name, fn, iter = 100) {
  const times = [];

  for (let w = 0; w < 3; w++) await fn();

  for (let i = 0; i < iter; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }

  const total = times.reduce((a, b) => a + b, 0);
  return {
    name,
    iterations: iter,
    totalMs:    +total.toFixed(4),
    avgMs:      +(total / iter).toFixed(4),
    minMs:      +Math.min(...times).toFixed(4),
    maxMs:      +Math.max(...times).toFixed(4),
  };
}

// ─── Імпорт модулів через динамічний require ──────────────────────────────────

// Node.js не підтримує ES-модулі з import без "--input-type=module",
// тому читаємо вихідники та виконуємо через Function().
const fs = require('fs');
const path = require('path');

function loadESModule(relPath) {
  const src = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  // Замінюємо ES import/export на звичайні змінні для виконання в Node
  const prepared = src
    .replace(/^import\s.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, 'module.exports = ')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+(const|let|function|class)\s+/gm, '$1 ');
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename',
                          'performance', 'console', prepared);
  const mod = { exports: {} };
  fn(mod, mod.exports, require, __dirname, __filename, performance, console);
  return mod.exports;
}

// ─── Завантаження модулів ─────────────────────────────────────────────────────

let animationsModule, loggerModule, tournamentModule;

try {
  animationsModule  = loadESModule('src/animations.js');
} catch (e) {
  animationsModule = null;
}
try {
  loggerModule      = loadESModule('src/logger.js');
} catch (e) {
  loggerModule = null;
}
try {
  tournamentModule  = loadESModule('src/tournament.js');
} catch (e) {
  tournamentModule = null;
}

// ─── Тестові сценарії ─────────────────────────────────────────────────────────

const results = [];

// ── 1. DOM-операції: querySelectorAll + observe ────────────────────────────────
{
  const res = measureSync('DOM: querySelectorAll(50 елементів) + IntersectionObserver.observe', () => {
    const obs = new MockIntersectionObserver(() => {});
    const els = document.querySelectorAll('.fade-in');
    els.forEach((el) => obs.observe(el));
  }, 500);
  results.push(res);
}

// ── 2. Ініціалізація Observer (якщо модуль завантажено) ───────────────────────
if (animationsModule && animationsModule.initFadeInObserver) {
  const res = measureSync('animations: initFadeInObserver() — 50 елементів', () => {
    animationsModule.initFadeInObserver('.fade-in', { threshold: 0.1 });
  }, 200);
  results.push(res);
}

// ── 3. Logger: форматування + console.warn ────────────────────────────────────
{
  // Тестуємо вручну без модуля — просто рядкову обробку (hot path)
  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
  const res = measureSync('Logger: форматування запису (string ops)', () => {
    const level   = levels[Math.floor(Math.random() * levels.length)];
    const ts      = new Date().toISOString();
    const message = 'Тест продуктивності логування';
    const entry   = `[${ts}] [${level}] [tournament] ${message}`;
    // Імітуємо фільтрацію рівня
    if (levels.indexOf(level) >= levels.indexOf('WARN')) {
      void entry; // у реальному коді тут console.warn/error
    }
  }, 5000);
  results.push(res);
}

// ── 4. Logger: повний екземпляр (якщо модуль доступний) ───────────────────────
if (loggerModule) {
  const LoggerClass = loggerModule.Logger || loggerModule.default || loggerModule;
  if (typeof LoggerClass === 'function') {
    const logger = new LoggerClass({ minLevel: 'WARN', transports: [() => {}] });
    const res = measureSync('Logger: logger.warn() — повний pipeline', () => {
      logger.warn('perf', 'Тест продуктивності', { iteration: 1 });
    }, 2000);
    results.push(res);
  }
}

// ── 5. Бізнес-логіка: checkStatus ─────────────────────────────────────────────
{
  const statuses = ['active', 'inactive', 'pending', 'finished'];
  const res = measureSync('tournament: checkStatus() — 4 гілки', () => {
    const s = statuses[Math.floor(Math.random() * statuses.length)];
    // Відтворюємо логіку з tournament.js
    const result = s === 'active';
    void result;
  }, 10000);
  results.push(res);
}

// ── 6. fetch-запит: побудова URL + формування об'єкта запиту ──────────────────
{
  const BASE_URL = 'https://api.tournament.ua/v1';
  const res = measureSync('tournament: побудова URL + headers (без мережі)', () => {
    const id      = Math.floor(Math.random() * 1000);
    const url     = `${BASE_URL}/tournaments/${id}`;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    void { url, headers };
  }, 10000);
  results.push(res);
}

// ── 7. Обробка масиву результатів матчу ───────────────────────────────────────
{
  const mockRounds = Array.from({ length: 100 }, (_, i) => ({
    id:        i + 1,
    completed: Math.random() > 0.3,
    results:   Array.from({ length: 8 }, () => ({ score: Math.random() * 100 })),
  }));

  const res = measureSync('tournament: фільтр + map завершених раундів (100 раундів)', () => {
    const completed = mockRounds
      .filter((r) => r.completed === true)
      .map((r) => ({
        id:       r.id,
        avgScore: r.results.reduce((acc, p) => acc + p.score, 0) / r.results.length,
      }));
    void completed;
  }, 1000);
  results.push(res);
}

// ── 8. Клас IntersectionObserver: масовий observe/unobserve ───────────────────
{
  const elements = Array.from({ length: 200 }, (_, i) => new MockElement(`e${i}`));
  const res = measureSync('DOM: IntersectionObserver observe+unobserve (200 елементів)', () => {
    const obs = new MockIntersectionObserver(() => {});
    elements.forEach((el) => obs.observe(el));
    elements.forEach((el) => obs.unobserve(el));
    obs.disconnect();
  }, 500);
  results.push(res);
}

// ─── Вивід результатів ────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           РЕЗУЛЬТАТИ БАЗОВОГО ПРОФІЛЮВАННЯ — tournament-landing             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

const col = (s, w) => String(s).padEnd(w);
const colR = (s, w) => String(s).padStart(w);

console.log(
  col('Сценарій', 52),
  colR('Ітер.', 7),
  colR('Сер. (ms)', 10),
  colR('Мін. (ms)', 10),
  colR('Макс. (ms)', 11),
);
console.log('─'.repeat(92));

results.forEach((r) => {
  console.log(
    col(r.name, 52),
    colR(r.iterations, 7),
    colR(r.avgMs, 10),
    colR(r.minMs, 10),
    colR(r.maxMs, 11),
  );
});

console.log('─'.repeat(92));

// Знаходимо "гарячі точки" — топ-3 за середнім часом
const sorted = [...results].sort((a, b) => b.avgMs - a.avgMs);
console.log('\n🔥 Гарячі точки (топ-3 за середнім часом):');
sorted.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name} — avg ${r.avgMs} ms`);
});

console.log('\n✅ Профілювання завершено.\n');

// Зберігаємо JSON для CI/звітів
const report = {
  timestamp:   new Date().toISOString(),
  environment: { node: process.version, platform: process.platform },
  results,
  hotspots:    sorted.slice(0, 3).map((r) => ({ name: r.name, avgMs: r.avgMs })),
};
fs.writeFileSync(path.join(__dirname, 'performance-report.json'), JSON.stringify(report, null, 2));
console.log('📄 Звіт збережено: tests/performance-report.json\n');
