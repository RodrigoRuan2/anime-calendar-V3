import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesDiscoveryFilters, normalizeRecommendation, recommendationReasons, recommendationVariables } from '../src/services/recommendationApi.js'

test('busca com limites inclusivos e filtra Isekai + Comédia + nota 9', () => {
  const filters = { genres: ['Comedy', 'Fantasy'], topic: 'Isekai', score: '9', format: 'TV', yearStart: '2020', yearEnd: '2025', maxEpisodes: '24', status: 'FINISHED', sort: 'score', excludeSaved: true }
  assert.deepEqual(recommendationVariables(filters, 2), {
    page: 2, genre: 'Comedy', tag: 'Isekai', minimumTagRank: 50, minimumScore: 89,
    formats: ['TV'], status: 'FINISHED', yearStart: 20191231,
    yearEnd: 20260101, maxEpisodes: 25, sort: ['SCORE_DESC', 'POPULARITY_DESC'],
  })
  const anime = normalizeRecommendation({ id: 1, title: { romaji: 'Exemplo' }, averageScore: 90, genres: ['Comedy', 'Fantasy'], tags: [{ name: 'Isekai', rank: 90 }], episodes: 12 })
  assert.equal(matchesDiscoveryFilters(anime, filters), true)
  assert.equal(matchesDiscoveryFilters(anime, filters, new Set(['1'])), false)
  assert.deepEqual(recommendationReasons(anime, filters), ['Isekai', 'Comedy', 'Fantasy', '★ 9.0'])
})

test('não inclui anime que falha no segundo gênero ou não tem duração conhecida', () => {
  const filters = { genres: ['Comedy', 'Fantasy'], topic: 'all', score: '0', maxEpisodes: '12' }
  const anime = normalizeRecommendation({ id: 2, title: { romaji: 'Exemplo' }, genres: ['Comedy'], episodes: null })
  assert.equal(matchesDiscoveryFilters(anime, filters), false)
  assert.equal(recommendationVariables({ ...filters, format: 'all' }).formats, null)
  assert.deepEqual(recommendationVariables({ ...filters, format: 'OVA' }).formats, ['OVA'])
})
