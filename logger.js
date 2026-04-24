/**
 * @fileoverview Модуль логування для системи управління турнірами.
 *
 * Реалізує легковагову систему логування для браузерного середовища
 * без зовнішніх залежностей. Підтримує п'ять рівнів логування,
 * форматований вивід з міткою часу та фільтрацію за мінімальним рівнем.
 *
 * У продакшні рівень автоматично піднімається до INFO (DEBUG-повідомлення
 * не потрапляють у консоль). У development — виводяться всі рівні.
 *
 * @module logger
 * @version 1.0.0
 * @author Ваше Ім'я <student@university.edu.ua>
 *
 * @example
 * import logger from './logger.js';
 *
 * logger.info('tournament', 'App started');
 * logger.error('api', 'Fetch failed', { id: 't-42', status: 500 });
 */

// ─── Рівні логування ─────────────────────────────────────────────────────────

/**
 * Числові пріоритети рівнів логування.
 * Чим більше число — тим вищий пріоритет (серйозніше повідомлення).
 *
 * @readonly
 * @enum {number}
 */
const LOG_LEVELS = Object.freeze({
  DEBUG:    0,
  INFO:     1,
  WARN:     2,
  ERROR:    3,
  CRITICAL: 4,
});

/**
 * CSS-стилі для кольорового виводу в DevTools.
 * Кожен рівень має свій колір фону та тексту.
 *
 * @readonly
 * @type {Object.<string, string>}
 */
const LEVEL_STYLES = Object.freeze({
  DEBUG:    'color: #6b7280; font-weight: normal',
  INFO:     'color: #2563eb; font-weight: bold',
  WARN:     'color: #d97706; font-weight: bold',
  ERROR:    'color: #dc2626; font-weight: bold',
  CRITICAL: 'color: #fff; background: #dc2626; font-weight: bold; padding: 1px 4px; border-radius: 2px',
});

// ─── Визначення середовища ────────────────────────────────────────────────────

/**
 * Поточне середовище виконання.
 * Визначається через `import.meta.env.MODE` (Vite) або `'development'` за замовчуванням.
 *
 * @type {string}
 */
const ENV = (typeof import.meta !== 'undefined' && import.meta.env?.MODE) || 'development';

/**
 * Мінімальний рівень логування залежно від середовища.
 * - `development` → DEBUG (виводиться все)
 * - `production`  → WARN  (тільки попередження та помилки)
 * - `test`        → ERROR (тільки помилки)
 *
 * @type {number}
 */
const MIN_LEVEL = {
  development: LOG_LEVELS.DEBUG,
  production:  LOG_LEVELS.WARN,
  test:        LOG_LEVELS.ERROR,
}[ENV] ?? LOG_LEVELS.DEBUG;

// ─── Внутрішні утиліти ───────────────────────────────────────────────────────

/**
 * Форматує поточний час у рядок `HH:MM:SS.mmm`.
 *
 * @returns {string} Відформатований час, наприклад `'14:32:07.341'`.
 */
function getTimestamp() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const ss  = String(now.getSeconds()).padStart(2, '0');
  const ms  = String(now.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * Повертає нативний метод консолі, відповідний рівню логування.
 *
 * @param {string} level - Назва рівня (`'DEBUG'`, `'INFO'`, тощо).
 * @returns {Function} Метод `console.debug`, `console.info`, `console.warn` або `console.error`.
 */
function getConsoleMethod(level) {
  const map = {
    DEBUG:    console.debug,
    INFO:     console.info,
    WARN:     console.warn,
    ERROR:    console.error,
    CRITICAL: console.error,
  };
  return map[level] || console.log;
}

// ─── Головний клас логера ─────────────────────────────────────────────────────

/**
 * Легковажний браузерний логер з підтримкою рівнів та модулів.
 *
 * Кожне повідомлення має формат:
 * ```
 * [HH:MM:SS.mmm] [LEVEL] [module] повідомлення  { context }
 * ```
 *
 * @class
 */
class Logger {
  /**
   * Створює екземпляр логера.
   *
   * @param {object} [options={}]                      - Параметри конфігурації.
   * @param {number} [options.minLevel=MIN_LEVEL]       - Мінімальний рівень для виводу.
   * @param {boolean} [options.useColors=true]          - Вмикати кольоровий вивід у DevTools.
   * @param {Function[]} [options.transports=[]]        - Додаткові транспорти (напр., відправка на сервер).
   */
  constructor(options = {}) {
    /** @type {number} */
    this.minLevel   = options.minLevel   ?? MIN_LEVEL;
    /** @type {boolean} */
    this.useColors  = options.useColors  ?? true;
    /** @type {Function[]} */
    this.transports = options.transports ?? [];
  }

  /**
   * Головний метод виводу повідомлення.
   * Перевіряє рівень, форматує рядок і передає у консоль та транспорти.
   *
   * @param {string} level      - Рівень логування (ключ з {@link LOG_LEVELS}).
   * @param {string} module     - Назва модуля/компонента, що генерує лог.
   * @param {string} message    - Текст повідомлення.
   * @param {*}      [context]  - Додаткові дані (об'єкт, помилка, тощо).
   * @returns {void}
   */
  log(level, module, message, context) {
    if (LOG_LEVELS[level] < this.minLevel) {
      return;
    }

    const ts     = getTimestamp();
    const prefix = `[${ts}] [${level.padEnd(8)}] [${module}]`;
    const method = getConsoleMethod(level);
    const style  = LEVEL_STYLES[level] || '';

    if (this.useColors && typeof window !== 'undefined') {
      // Кольоровий вивід у браузерних DevTools
      if (context !== undefined) {
        method(`%c${prefix}%c ${message}`, style, 'color: inherit', context);
      } else {
        method(`%c${prefix}%c ${message}`, style, 'color: inherit');
      }
    } else {
      // Простий текстовий вивід (Node.js, тести)
      const line = context !== undefined
        ? `${prefix} ${message}`
        : `${prefix} ${message}`;
      method(line, context !== undefined ? context : '');
    }

    // Передаємо в зовнішні транспорти (напр., remote logging)
    this.transports.forEach((transport) => {
      transport({ level, module, message, context, timestamp: ts });
    });
  }

  /**
   * Логує повідомлення рівня DEBUG.
   * Використовується для детального трасування: вхідні аргументи, проміжні стани.
   * Не виводиться у `production`.
   *
   * @param {string} module   - Назва модуля.
   * @param {string} message  - Текст повідомлення.
   * @param {*}      [context] - Додаткові дані.
   *
   * @example
   * logger.debug('pairing', 'Sorted players', sortedList);
   */
  debug(module, message, context) {
    this.log('DEBUG', module, message, context);
  }

  /**
   * Логує повідомлення рівня INFO.
   * Використовується для ключових подій нормальної роботи:
   * ініціалізація модулів, завантаження даних, зміна стану.
   *
   * @param {string} module   - Назва модуля.
   * @param {string} message  - Текст повідомлення.
   * @param {*}      [context] - Додаткові дані.
   *
   * @example
   * logger.info('tournament', 'Tournament loaded', { id: 't-42', name: 'Open 2025' });
   */
  info(module, message, context) {
    this.log('INFO', module, message, context);
  }

  /**
   * Логує повідомлення рівня WARN.
   * Використовується для нештатних, але не критичних ситуацій:
   * відсутні необов'язкові поля, повторні спроби, deprecated API.
   *
   * @param {string} module   - Назва модуля.
   * @param {string} message  - Текст повідомлення.
   * @param {*}      [context] - Додаткові дані.
   *
   * @example
   * logger.warn('pairing', 'All opponents already met, using fallback pairing');
   */
  warn(module, message, context) {
    this.log('WARN', module, message, context);
  }

  /**
   * Логує повідомлення рівня ERROR.
   * Використовується коли операція не виконалась, але застосунок продовжує роботу.
   *
   * @param {string} module   - Назва модуля.
   * @param {string} message  - Текст повідомлення.
   * @param {*}      [context] - Об'єкт помилки або додатковий контекст.
   *
   * @example
   * logger.error('api', 'Failed to fetch tournament', { id, status: 404 });
   */
  error(module, message, context) {
    this.log('ERROR', module, message, context);
  }

  /**
   * Логує повідомлення рівня CRITICAL.
   * Використовується для фатальних помилок, що роблять продовження роботи неможливим.
   * Виводиться завжди — незалежно від `minLevel`.
   *
   * @param {string} module   - Назва модуля.
   * @param {string} message  - Текст повідомлення.
   * @param {*}      [context] - Об'єкт помилки або додатковий контекст.
   *
   * @example
   * logger.critical('app', 'Unrecoverable state — tournament data corrupted');
   */
  critical(module, message, context) {
    // CRITICAL завжди виводиться — зберігаємо minLevel, виводимо примусово
    const savedLevel  = this.minLevel;
    this.minLevel     = LOG_LEVELS.CRITICAL;
    this.log('CRITICAL', module, message, context);
    this.minLevel     = savedLevel;
  }
}

// ─── Singleton-екземпляр ─────────────────────────────────────────────────────

/**
 * Глобальний екземпляр логера для всього застосунку.
 * Імпортуйте його напряму — не створюйте новий `new Logger()` у модулях.
 *
 * @type {Logger}
 *
 * @example
 * import logger from './logger.js';
 * logger.info('myModule', 'Hello from my module');
 */
const logger = new Logger();

export default logger;
export { Logger, LOG_LEVELS };
