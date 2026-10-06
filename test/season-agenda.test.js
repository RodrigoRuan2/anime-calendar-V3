import test from 'node:test'
import assert from 'node:assert/strict'
import { groupSeasonAgenda, seasonAgendaDate } from '../src/utils/seasonAgenda.js'

const target = { year: 2026, season: 'fall' }
const anime = (title, startDate, releaseType = 'new') => ({ title, startDate, releaseType })

test('agenda agrupa estreias por mês e ordena dias confirmados antes dos indefinidos', () => {
  const groups = groupSeasonAgenda([
    anime('Dezembro', { year: 2026, month: 12, day: 2 }),
    anime('Outubro sem dia', { year: 2026, month: 10, day: null }),
    anime('Outubro dia dez', { year: 2026, month: 10, day: 10 }),
    anime('Outubro dia cinco', { year: 2026, month: 10, day: 5 }),
  ], target)
  assert.deepEqual(groups.map((group) => group.key), ['2026-10', '2026-12'])
  assert.deepEqual(groups[0].animes.map((item) => item.title), ['Outubro dia cinco', 'Outubro dia dez', 'Outubro sem dia'])
  assert.deepEqual(seasonAgendaDate(groups[0].animes[0], target), { kind: 'day', monthKey: '2026-10', day: 5, weekday: 'SEG' })
  assert.deepEqual(seasonAgendaDate(groups[0].animes[2], target), { kind: 'month', monthKey: '2026-10' })
})

test('continuação iniciada antes da temporada não ganha falsa data de estreia', () => {
  const groups = groupSeasonAgenda([
    anime('Em andamento', { year: 2026, month: 4, day: 1 }, 'continuing'),
    anime('Sem data', null),
    anime('Outubro', { year: 2026, month: 10, day: 1 }),
  ], target)
  assert.deepEqual(groups.map((group) => group.key), ['2026-10', 'airing', 'unknown'])
  assert.equal(seasonAgendaDate(groups[1].animes[0], target).kind, 'airing')
  assert.equal(seasonAgendaDate(groups[2].animes[0], target).kind, 'unknown')
})

test('dia impossível não aparece como data confirmada', () => {
  assert.deepEqual(seasonAgendaDate(anime('Dia inválido', { year: 2026, month: 11, day: 31 }), target), { kind: 'month', monthKey: '2026-11' })
})
