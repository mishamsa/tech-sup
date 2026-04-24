// src/tournament.js  — BEFORE linting fixes
// ⚠ Цей файл містить навмисні помилки для демонстрації роботи лінтера

// ПОМИЛКА 1: var замість const/let (no-var, prefer-const)
var BASE_URL = 'https://api.tournament.ua/v1'
var maxRounds = 7

// ПОМИЛКА 2: == замість === (eqeqeq)
function checkStatus(status) {
  if (status == 'active') {
    return true
  }
  return false
}

// ПОМИЛКА 3: console.log (no-console)
function fetchTournaments(id) {
  console.log('Fetching tournament:', id)
  return fetch(BASE_URL + '/tournaments/' + id)  // ПОМИЛКА 4: конкатенація замість шаблонного рядка (prefer-template)
    .then(function(response) {                    // ПОМИЛКА 5: function замість arrow (prefer-arrow-callback)
      if(response.ok == false) {                  // ПОМИЛКА 6: == та відсутність пробілу (eqeqeq, keyword-spacing)
        throw new Error('Network response was not ok')
      }
      return response.json()
    })
}

// ПОМИЛКА 7: невикористана змінна (no-unused-vars)
const unusedVariable = 'I am never used'

// ПОМИЛКА 8: відсутність фігурних дужок (curly)
function processRound(round) {
  if (round.completed == true)
    return round.results

  const results = []
  round.matches.forEach(function(match) {   // ПОМИЛКА 9: function замість arrow
    results.push(match.winner)
  })
  return results
}

// ПОМИЛКА 10: параметр переоголошується (no-param-reassign)
function normalizePlayer(player) {
  player.name = player.name.trim()
  player.rating = player.rating || 1500
  return player
}
