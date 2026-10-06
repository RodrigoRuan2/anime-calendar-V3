import test from 'node:test'
import assert from 'node:assert/strict'
import { formatScore, genreLabel, genreOptions, matchesGenreAndScore, scoreValue } from '../src/utils/animeFilters.js'

test('gêneros são traduzidos no filtro sem alterar o valor original', () => {
  assert.equal(genreLabel('Action'), 'Ação')
  assert.deepEqual(genreOptions([{ genres: ['Romance', 'Action'] }, { genres: ['Action', 'Drama'] }]), ['Action', 'Drama', 'Romance'])
})

test('nota ausente não vira zero e pode ser filtrada separadamente', () => {
  const rated = { genres: ['Action'], score: 8.4 }
  const unrated = { genres: ['Romance'], score: null }
  assert.equal(scoreValue(null), null)
  assert.equal(formatScore(8.4), '8,4')
  assert.equal(matchesGenreAndScore(rated, 'Action', '8'), true)
  assert.equal(matchesGenreAndScore(rated, 'Action', '9'), false)
  assert.equal(matchesGenreAndScore(rated, 'Romance', 'all'), false)
  assert.equal(matchesGenreAndScore(unrated, 'all', '7'), false)
  assert.equal(matchesGenreAndScore(unrated, 'all', 'unrated'), true)
})
