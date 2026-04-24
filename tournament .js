/**
 * @fileoverview Модуль управління турнірами з настільних ігор.
 *
 * Містить утиліти для роботи з API, обробки раундів, нормалізації
 * учасників та розрахунку параметрів Swiss-системи.
 *
 * @module tournament
 * @version 1.3.0
 * @author Ваше Ім'я <student@university.edu.ua>
 * @license MIT
 */

import logger from './logger.js';

// ─── Константи ──────────────────────────────────────────────────────────────

/** @constant {string} */
const BASE_URL = 'https://api.tournament.ua/v1';

/** @constant {number} */
const MAX_ROUNDS = 7;

/** @constant {string} Назва модуля для логів */
const MODULE = 'tournament';

// ─── JSDoc-типи ──────────────────────────────────────────────────────────────

/**
 * @typedef {object} Player
 * @property {string}  id
 * @property {string}  name
 * @property {number}  rating
 * @property {string}  [club]
 * @property {boolean} [active]
 */

/**
 * @typedef {object} Match
 * @property {string} id
 * @property {string} player1
 * @property {string} player2
 * @property {number} score1
 * @property {number} score2
 * @property {string} [winner]
 */

/**
 * @typedef {object} Round
 * @property {number}   number
 * @property {Match[]}  matches
 * @property {boolean}  completed
 * @property {object[]} [results]
 */

/**
 * @typedef {object} Tournament
 * @property {string}   id
 * @property {string}   name
 * @property {string}   status
 * @property {Player[]} participants
 * @property {Round[]}  rounds
 * @property {string}   createdAt
 */

// ─── Утиліти статусу ─────────────────────────────────────────────────────────

/**
 * Перевіряє, чи є турнір активним.
 *
 * @param {string} status - Рядок статусу турніру.
 * @returns {boolean}
 *
 * @example
 * checkStatus('active');  // → true
 * checkStatus('pending'); // → false
 */
function checkStatus(status) {
  return status === 'active';
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Отримує дані турніру за ідентифікатором через REST API.
 *
 * @async
 * @param {string} id - Унікальний ідентифікатор турніру.
 * @returns {Promise<Tournament>}
 * @throws {Error} При мережевій помилці або статусі не 2xx.
 */
function fetchTournaments(id) {
  logger.info(MODULE, `Fetching tournament`, { id });

  return fetch(`${BASE_URL}/tournaments/${id}`)
    .then((response) => {
      if (response.ok === false) {
        // ERROR: операція не виконалась, але застосунок продовжує роботу
        const err = new Error('Network response was not ok');
        logger.error(MODULE, `Failed to fetch tournament`, {
          id,
          status: response.status,
          statusText: response.statusText,
        });
        throw err;
      }

      logger.debug(MODULE, `Tournament fetched successfully`, {
        id,
        status: response.status,
      });

      return response.json();
    })
    .then((data) => {
      logger.info(MODULE, `Tournament data parsed`, {
        id: data.id,
        name: data.name,
        status: data.status,
        participantsCount: data.participants?.length ?? 0,
      });
      return data;
    })
    .catch((err) => {
      // Перехоплюємо мережеві помилки (відсутність з'єднання тощо)
      if (!(err.message === 'Network response was not ok')) {
        logger.error(MODULE, `Network error while fetching tournament`, {
          id,
          error: err.message,
        });
      }
      throw err;
    });
}

// ─── Обробка раундів ─────────────────────────────────────────────────────────

/**
 * Повертає результати завершеного раунду або витягує переможців з матчів.
 *
 * @param {Round} round - Об'єкт раунду для обробки.
 * @returns {object[]|string[]}
 */
function processRound(round) {
  logger.debug(MODULE, `Processing round`, {
    number: round.number,
    completed: round.completed,
    matchesCount: round.matches?.length ?? 0,
  });

  if (round.completed === true) {
    logger.info(MODULE, `Round ${round.number} already completed, returning cached results`);
    return round.results;
  }

  const results = [];
  round.matches.forEach((match) => {
    results.push(match.winner);
  });

  logger.info(MODULE, `Round ${round.number} processed`, {
    winnersExtracted: results.length,
    pendingMatches: results.filter((w) => !w).length,
  });

  return results;
}

// ─── Учасники ────────────────────────────────────────────────────────────────

/**
 * Нормалізує об'єкт учасника.
 *
 * @param {object} player
 * @param {string} player.name
 * @param {number} [player.rating]
 * @returns {Player}
 */
function normalizePlayer({ name, rating, ...rest }) {
  const normalized = {
    ...rest,
    name: name.trim(),
    rating: rating || 1500,
  };

  if (!rating) {
    // WARN: рейтинг відсутній — встановлюємо дефолтний
    logger.warn(MODULE, `Player has no rating, defaulting to 1500`, {
      name: normalized.name,
      id: rest.id,
    });
  }

  logger.debug(MODULE, `Player normalized`, { name: normalized.name, rating: normalized.rating });

  return normalized;
}

// ─── Swiss-система ───────────────────────────────────────────────────────────

/**
 * Обчислює рекомендовану кількість раундів для Swiss-турніру.
 *
 * @param {number} participantCount - Кількість учасників (≥ 2).
 * @returns {number}
 * @throws {Error} Якщо менше 2 учасників.
 */
function calcSwissRounds(participantCount) {
  logger.debug(MODULE, `Calculating Swiss rounds`, { participantCount });

  if (participantCount < 2) {
    const err = new Error('Tournament requires at least 2 participants');
    // CRITICAL: неможливо продовжити — турнір не може бути створений
    logger.critical(MODULE, `Cannot create tournament: insufficient participants`, {
      participantCount,
      minimum: 2,
    });
    throw err;
  }

  const rounds = Math.min(Math.ceil(Math.log2(participantCount)), MAX_ROUNDS);

  logger.info(MODULE, `Swiss rounds calculated`, {
    participantCount,
    rounds,
    cappedByMax: rounds === MAX_ROUNDS,
  });

  return rounds;
}

/**
 * Форматує результат матчу у рядок для відображення.
 *
 * @param {Match} match
 * @returns {string}
 */
function formatMatchResult(match) {
  const { player1, player2, score1, score2 } = match;
  return `${player1} ${score1}–${score2} ${player2}`;
}

// ─── Розрахунок рейтингу Elo ─────────────────────────────────────────────────

/**
 * Обчислює нові рейтинги Elo двох гравців після завершення матчу.
 *
 * @param {number}          ratingA
 * @param {number}          ratingB
 * @param {'A'|'B'|'draw'}  result
 * @param {number}          [kFactor=32]
 * @returns {{ newRatingA: number, newRatingB: number }}
 */
function calcEloRating(ratingA, ratingB, result, kFactor = 32) {
  logger.debug(MODULE, `Calculating Elo rating`, { ratingA, ratingB, result, kFactor });

  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreA    = result === 'A' ? 1 : result === 'draw' ? 0.5 : 0;
  const scoreB    = 1 - scoreA;

  const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedA));
  const newRatingB = Math.round(ratingB + kFactor * (scoreB - expectedB));

  const deltaA = newRatingA - ratingA;

  // WARN: великий перепад рейтингів може свідчити про некоректні дані
  if (Math.abs(ratingA - ratingB) > 600) {
    logger.warn(MODULE, `Large rating gap detected — result may skew ratings significantly`, {
      ratingA, ratingB, gap: Math.abs(ratingA - ratingB),
    });
  }

  logger.info(MODULE, `Elo ratings updated`, {
    ratingA, newRatingA, deltaA,
    ratingB, newRatingB, deltaB: newRatingB - ratingB,
    result,
  });

  return { newRatingA, newRatingB };
}

/**
 * Сортує масив учасників за рейтингом у спадному порядку.
 *
 * @param {Player[]} players
 * @returns {Player[]}
 */
function sortPlayersByRating(players) {
  logger.debug(MODULE, `Sorting ${players.length} players by rating`);
  return players.slice().sort((a, b) => b.rating - a.rating);
}

// ─── Експорт ────────────────────────────────────────────────────────────────

export {
  BASE_URL,
  MAX_ROUNDS,
  checkStatus,
  fetchTournaments,
  processRound,
  normalizePlayer,
  calcSwissRounds,
  formatMatchResult,
  calcEloRating,
  sortPlayersByRating,
};
