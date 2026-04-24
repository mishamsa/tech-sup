/**
 * Модуль керування турнірною логікою.
 * Забезпечує взаємодію з API та обробку результатів матчів.
 */

/**
 * Отримує дані про турнір з віддаленого сервера.
 * * @async
 * @param {number|string} id - Унікальний ідентифікатор турніру.
 * @returns {Promise<Object>} Об'єкт із даними турніру (назва, учасники, статус).
 * @throws {Error} Викидає помилку, якщо сервер повернув некоректний статус або мережа недоступна.
 */
function fetchTournaments(id) {
  return fetch(`${BASE_URL}/tournaments/${id}`)
    .then((response) => {
      if (response.ok === false) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    });
}

/**
 * Розраховує рекомендовану кількість раундів для Swiss-турніру.
 * Використовує логарифмічну формулу: ceil(log2(N)).
 * * @param {number} participantCount - Загальна кількість учасників.
 * @returns {number} Кількість раундів.
 * @throws {Error} Якщо кількість учасників менше ніж 2.
 */
function calcSwissRounds(participantCount) {
  if (participantCount < 2) {
    throw new Error('Tournament requires at least 2 participants');
  }
  return Math.min(Math.ceil(Math.log2(participantCount)), MAX_ROUNDS);
}