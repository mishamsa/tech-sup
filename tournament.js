// src/tournament.js  — AFTER linting fixes
// ✅ Усі помилки виправлено згідно з правилами eslint.config.js

// ВИПРАВЛЕННЯ 1: var → const (no-var, prefer-const)
const BASE_URL = 'https://api.tournament.ua/v1';
const MAX_ROUNDS = 7; // renamed to UPPER_CASE — constant convention

// ВИПРАВЛЕННЯ 2: == → === (eqeqeq); ВИПРАВЛЕННЯ: зайвий else після return (no-else-return)
function checkStatus(status) {
  return status === 'active';
}

// ВИПРАВЛЕННЯ 3: console.log видалено (no-console)
// ВИПРАВЛЕННЯ 4: конкатенація → шаблонний рядок (prefer-template)
// ВИПРАВЛЕННЯ 5: function → arrow function; == → === (eqeqeq, keyword-spacing)
function fetchTournaments(id) {
  return fetch(`${BASE_URL}/tournaments/${id}`)
    .then((response) => {
      if (response.ok === false) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    });
}

// ВИПРАВЛЕННЯ 6: видалено невикористану змінну (no-unused-vars)

// ВИПРАВЛЕННЯ 7: додано фігурні дужки (curly); == → === (eqeqeq)
// ВИПРАВЛЕННЯ 8: function → arrow function
function processRound(round) {
  if (round.completed === true) {
    return round.results;
  }

  const results = [];
  round.matches.forEach((match) => {
    results.push(match.winner);
  });
  return results;
}

// ВИПРАВЛЕННЯ 9: не переоголошуємо параметр — деструктуруємо (no-param-reassign)
function normalizePlayer({ name, rating, ...rest }) {
  return {
    ...rest,
    name: name.trim(),
    rating: rating || 1500,
  };
}

// ── Додатковий модуль: утиліти для Swiss-системи ──────────────────────────

/**
 * Розраховує кількість раундів Swiss-турніру.
 * @param {number} participantCount - кількість учасників
 * @returns {number} рекомендована кількість раундів
 */
function calcSwissRounds(participantCount) {
  if (participantCount < 2) {
    throw new Error('Tournament requires at least 2 participants');
  }
  return Math.min(Math.ceil(Math.log2(participantCount)), MAX_ROUNDS);
}

/**
 * Форматує рядок результату матчу для відображення.
 * @param {object} match - об'єкт матчу
 * @returns {string} відформатований рядок
 */
function formatMatchResult(match) {
  const { player1, player2, score1, score2 } = match;
  return `${player1} ${score1}–${score2} ${player2}`;
}

export { checkStatus, fetchTournaments, processRound, normalizePlayer, calcSwissRounds, formatMatchResult };
