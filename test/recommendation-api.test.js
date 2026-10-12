import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendationVariables } from '../src/services/recommendationApi.js'

test('monta filtros da recomendação para AniList', () => {
  assert.deepEqual(recommendationVariables({ topic: 'Isekai', genre: 'Comedy', score: '9' }), {
    tag: 'Isekai', genre: 'Comedy', minimumScore: 89,
  })
})

test('permite recomendação sem tema nem gênero específico', () => {
  assert.deepEqual(recommendationVariables({ topic: 'all', genre: 'all', score: '7' }), {
    tag: null, genre: null, minimumScore: 69,
  })
})
