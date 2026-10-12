import test from 'node:test'
import assert from 'node:assert/strict'
import { getMovieMonthSummary, getMovieReleaseInfo } from '../src/utils/movieRelease.js'

test('filme sem dia anunciado não é tratado como lançado no dia 1º', () => {
  const movie = { episodeDate: '2026-01-01T12:00:00.000Z', releaseDateOnly: true, releaseDayKnown: false }
  assert.deepEqual(getMovieReleaseInfo(movie, new Date('2026-10-12T15:00:00Z')), { label: 'Dia a confirmar', phase: 'unknown' })
})

test('resumo dos filmes conta lançados, futuros e sem dia separadamente', () => {
  const movies = [
    { episodeDate: '2026-01-10T12:00:00.000Z', releaseDateOnly: true, releaseDayKnown: true },
    { episodeDate: '2026-12-10T12:00:00.000Z', releaseDateOnly: true, releaseDayKnown: true },
    { episodeDate: '2026-01-01T12:00:00.000Z', releaseDateOnly: true, releaseDayKnown: false },
  ]
  assert.deepEqual(getMovieMonthSummary(movies, new Date('2026-10-12T15:00:00Z')), { released: 1, upcoming: 1, unknown: 1 })
})
