/**
 * @fileoverview Конфігурація системи логування.
 *
 * Визначає налаштування логера залежно від середовища виконання.
 * Також містить фабрику транспорту для відправки критичних помилок
 * на сервер (remote logging).
 *
 * @module logger.config
 * @version 1.0.0
 */

import { Logger, LOG_LEVELS } from './logger.js';

// ─── Remote transport (для продакшну) ────────────────────────────────────────

/**
 * Фабрика remote-транспорту: відправляє ERROR та CRITICAL логи на сервер.
 * У development не робить нічого (повертає no-op функцію).
 *
 * @param {string} endpoint - URL ендпоінту для відправки логів.
 * @returns {Function} Функція-транспорт, сумісна з `Logger.transports`.
 *
 * @example
 * const transport = createRemoteTransport('https://api.tournament.ua/logs');
 * const logger = new Logger({ transports: [transport] });
 */
function createRemoteTransport(endpoint) {
  const isProduction = (
    typeof import.meta !== 'undefined' && import.meta.env?.MODE
  ) === 'production';

  if (!isProduction) {
    // У dev/test не відправляємо нічого на сервер
    return () => {};
  }

  return ({ level, module, message, context, timestamp }) => {
    // Відправляємо лише серйозні помилки
    if (LOG_LEVELS[level] < LOG_LEVELS.ERROR) {
      return;
    }

    // Використовуємо sendBeacon для надійної доставки навіть при закритті вкладки
    const payload = JSON.stringify({
      level,
      module,
      message,
      context: context instanceof Error
        ? { name: context.name, message: context.message, stack: context.stack }
        : context,
      timestamp,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, payload);
    }
  };
}

// ─── Конфігурований екземпляр логера ─────────────────────────────────────────

/**
 * Попередньо налаштований логер для застосунку.
 *
 * Рівні за середовищем:
 * | Середовище  | Мінімальний рівень | Що виводиться              |
 * |-------------|-------------------|----------------------------|
 * | development | DEBUG             | Все                        |
 * | production  | WARN              | WARN, ERROR, CRITICAL      |
 * | test        | ERROR             | ERROR, CRITICAL            |
 *
 * @type {Logger}
 */
const configuredLogger = new Logger({
  transports: [
    createRemoteTransport('https://api.tournament.ua/v1/logs'),
  ],
});

export default configuredLogger;
export { createRemoteTransport };
