import test from 'node:test'
import assert from 'node:assert/strict'
import { getMyWeekSummary } from '../src/utils/myWeek.js'

const now = new Date('2026-10-06T15:00:00Z')
const items = [
  { id: 1, title: 'Já exibido', episodeNumber: 4, airingAt: '2026-10-05T15:00:00Z' },
  { id: 2, title: 'Próximo', episodeNumber: 5, airingAt: '2026-10-07T15:00:00Z' },
  { id: 3, title: 'Fora da lista', episodeNumber: 2, airingAt: '2026-10-08T15:00:00Z' },
]

test('minha semana mostra só acompanhados e destaca próximo episódio', () => {
  const summary = getMyWeekSummary(items, (anime) => ({ watching: anime.id !== 3, watchedEpisodes: [] }), now)
  assert.deepEqual(summary.followed.map((anime) => anime.id), [1, 2])
  assert.equal(summary.next.id, 2)
  assert.equal(summary.pendingCount, 1)
})

test('episódio assistido não aparece como pendente', () => {
  const summary = getMyWeekSummary(items, (anime) => ({ watching: anime.id === 1, watchedEpisodes: [4] }), now)
  assert.equal(summary.pendingCount, 0)
  assert.equal(summary.next, null)
})
