import test from 'node:test'
import assert from 'node:assert/strict'
import { getAiredWeeklyEpisodes } from '../src/utils/episodeProgress.js'

test('atalho semanal usa apenas o episódio já lançado', () => {
  const now = new Date('2026-10-06T15:00:00Z')
  const episodes = getAiredWeeklyEpisodes([
    { anilistId: 1, episodeNumber: 10, airingAt: '2026-10-05T15:00:00Z' },
    { anilistId: 1, episodeNumber: 11, airingAt: '2026-10-07T15:00:00Z' },
    { anilistId: 2, episodeNumber: 4, airingAt: '2026-10-06T14:00:00Z' },
    { anilistId: 3, episodeNumber: 2, airingAt: null },
  ], now)
  assert.equal(episodes.get('1'), 10)
  assert.equal(episodes.get('2'), 4)
  assert.equal(episodes.has('3'), false)
})

test('se há dois episódios lançados na semana, sugere o mais recente', () => {
  const episodes = getAiredWeeklyEpisodes([
    { anilistId: 1, episodeNumber: 8, airingAt: '2026-10-06T14:00:00Z' },
    { anilistId: 1, episodeNumber: 7, airingAt: '2026-10-05T14:00:00Z' },
  ], new Date('2026-10-06T15:00:00Z'))
  assert.equal(episodes.get('1'), 8)
})
