import test from 'node:test'
import assert from 'node:assert/strict'
import { getLocalScheduleFields, getWeekRange, groupScheduleByDay, mergeScheduleSources, scheduleConfidence } from '../src/utils/weeklySchedule.js'

const base = { anilistId: 1, title: 'Teste', episodeNumber: 7, coverImage: null, streams: [] }

test('converte UTC para o dia correto em São Paulo', () => {
  const fields = getLocalScheduleFields('2026-09-15T02:30:00.000Z')
  assert.deepEqual(fields, { localDate: '2026-09-14', localTime: '23:30', weekday: 'monday' })
})

test('semana começa na segunda e atravessa ano corretamente', () => {
  const range = getWeekRange(0, 'America/Sao_Paulo', new Date('2026-12-31T15:00:00.000Z'))
  assert.equal(range.startDate, '2026-12-28')
  assert.equal(getWeekRange(1, 'America/Sao_Paulo', new Date('2026-12-31T15:00:00.000Z')).startDate, '2027-01-04')
})

test('merge deduplica fontes e prioriza AnimeSchedule', () => {
  const result = mergeScheduleSources([[{ ...base, source: 'animeschedule', airingAt: '2026-09-14T21:00:00Z', streams: [{ name: 'Crunchyroll' }] }], [{ ...base, source: 'tsuzuki', airingAt: '2026-09-14T21:05:00Z', platform: 'Crunchyroll' }], [{ ...base, source: 'anilist', airingAt: '2026-09-14T21:00:00Z' }]])
  assert.equal(result.length, 1)
  assert.equal(result[0].timingConfidence, 'corroborated')
  assert.equal(result[0].streams[0].name, 'Crunchyroll')
})

test('AniList conecta títulos romaji e inglês entregues por fontes diferentes', () => {
  const result = mergeScheduleSources([[
    { ...base, anilistId: null, title: 'Toumei na Yoru', titleRomaji: 'Toumei na Yoru', source: 'animeschedule', airingAt: '2026-09-14T21:00:00Z' },
  ], [
    { ...base, anilistId: null, title: 'Love Unseen', titleEnglish: 'Love Unseen', source: 'tsuzuki', airingAt: '2026-09-14T21:00:00Z' },
  ], [
    { ...base, anilistId: 99, title: 'Toumei na Yoru', titleRomaji: 'Toumei na Yoru', titleEnglish: 'Love Unseen', source: 'anilist', airingAt: '2026-09-14T21:00:00Z' },
  ]])
  assert.equal(result.length, 1)
  assert.equal(result[0].anilistId, 99)
})

test('união por aliases conserva a imagem da fonte prioritária', () => {
  const result = mergeScheduleSources([[
    { ...base, title: 'Nome Romaji', titleRomaji: 'Nome Romaji', coverImage: 'https://img.example/high.jpg', source: 'animeschedule', airingAt: '2026-09-14T21:00:00Z' },
  ], [
    { ...base, title: 'English Name', titleEnglish: 'English Name', coverImage: 'https://img.example/low.jpg', source: 'tsuzuki', airingAt: '2026-09-14T21:00:00Z' },
  ], [
    { ...base, anilistId: 3, title: 'Nome Romaji', titleRomaji: 'Nome Romaji', titleEnglish: 'English Name', source: 'anilist', airingAt: '2026-09-14T21:00:00Z' },
  ]])
  assert.equal(result.length, 1)
  assert.equal(result[0].coverImage, 'https://img.example/high.jpg')
})

test('barreira final não deixa o mesmo AniList e episódio virar dois cards', () => {
  const result = mergeScheduleSources([[{ ...base, anilistId: 44, source: 'tsuzuki', airingAt: '2026-09-14T21:00:00Z' }], [{ ...base, anilistId: 44, source: 'anilist', airingAt: '2026-09-14T21:00:00Z' }]])
  assert.equal(result.length, 1)
})

test('deduplica títulos que divergem apenas por separação de palavras', () => {
  const result = mergeScheduleSources([[{ ...base, anilistId: null, title: 'Ugoku! Neko Mukashibanashi', source: 'animeschedule', airingAt: '2026-09-16T11:01:00Z' }], [{ ...base, anilistId: 188529, title: 'Ugoku! Neko Mukashi Banashi', titleRomaji: 'Ugoku! Neko Mukashi Banashi', source: 'anilist', airingAt: '2026-09-16T11:00:00Z' }]])
  assert.equal(result.length, 1)
  assert.equal(result[0].anilistId, 188529)
})

test('marca horários divergentes e mantém fontes para transparência', () => {
  const result = mergeScheduleSources([[{ ...base, source: 'animeschedule', airingAt: '2026-09-14T18:00:00Z' }], [{ ...base, source: 'anilist', airingAt: '2026-09-14T19:00:00Z' }]])
  assert.equal(result[0].timingConfidence, 'conflicting')
  assert.equal(result[0].scheduleSources.length, 2)
})

test('horário estimado não é confirmado', () => {
  assert.equal(scheduleConfidence([{ ...base, source: 'tsuzuki', airingAt: '2026-09-14T18:00:00Z', timeEstimated: true }]), 'estimated')
})

test('agrupa e preserva horário desconhecido no fim', () => {
  const grouped = groupScheduleByDay([{ ...base, id: '1', weekday: 'monday', airingAt: '2026-09-14T21:00:00Z' }, { ...base, id: '2', weekday: 'monday', airingAt: null }])
  assert.equal(grouped.monday.length, 2)
})
