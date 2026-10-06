import test from 'node:test'
import assert from 'node:assert/strict'
import axios from 'axios'
import { getAggregatedWeeklySchedule } from '../src/services/animeScheduleApi.js'
import { getSeasonAnime } from '../src/services/seasonCatalogApi.js'
import { readSnapshot, writeSnapshot } from '../src/utils/snapshotCache.js'
import { withDeadline } from '../src/utils/withDeadline.js'
import { getWeekRange } from '../src/utils/weeklySchedule.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
}

test('cache persiste entre sessões e lê o formato anterior', () => {
  const local = new MemoryStorage()
  const session = new MemoryStorage()
  const oldLocal = globalThis.localStorage
  const oldSession = globalThis.sessionStorage
  globalThis.localStorage = local
  globalThis.sessionStorage = session
  try {
    session.setItem('old', JSON.stringify({ ts: Date.now(), data: { items: [1] } }))
    assert.deepEqual(readSnapshot('old', 60_000).data.items, [1])
    writeSnapshot('new', { items: [2] })
    session.values.clear()
    assert.deepEqual(readSnapshot('new', 60_000).data.items, [2])
  } finally {
    globalThis.localStorage = oldLocal
    globalThis.sessionStorage = oldSession
  }
})

test('cache descarta dados velhos e escolhe a cópia mais recente', () => {
  const local = new MemoryStorage()
  const session = new MemoryStorage()
  const oldLocal = globalThis.localStorage
  const oldSession = globalThis.sessionStorage
  globalThis.localStorage = local
  globalThis.sessionStorage = session
  try {
    local.setItem('week', JSON.stringify({ timestamp: Date.now() - 3_600_000, data: 'antigo' }))
    session.setItem('week', JSON.stringify({ timestamp: Date.now(), data: 'novo' }))
    assert.equal(readSnapshot('week', 60_000).data, 'novo')
    session.values.clear()
    assert.equal(readSnapshot('week', 60_000), null)
  } finally {
    globalThis.localStorage = oldLocal
    globalThis.sessionStorage = oldSession
  }
})

test('fonte lenta termina no prazo sem bloquear as demais', async () => {
  const slow = withDeadline(() => new Promise(() => {}), 10)
  const fast = withDeadline(() => Promise.resolve('pronto'), 100)
  assert.equal(await fast, 'pronto')
  await assert.rejects(slow, { name: 'TimeoutError' })
})

test('troca de período cancela uma requisição em andamento', async () => {
  const controller = new AbortController()
  const request = withDeadline(() => new Promise(() => {}), 1000, controller.signal)
  controller.abort(new DOMException('Cancelado.', 'AbortError'))
  await assert.rejects(request, { name: 'AbortError' })
})

test('agenda mostra a primeira fonte antes da reconciliação final sem duplicar', async () => {
  const oldLocal = globalThis.localStorage
  const oldSession = globalThis.sessionStorage
  const oldAdapter = axios.defaults.adapter
  globalThis.localStorage = new MemoryStorage()
  globalThis.sessionStorage = new MemoryStorage()
  const range = getWeekRange()
  const airingAt = Math.floor((new Date(range.start).getTime() + 86_400_000) / 1000)
  let finishAniList
  axios.defaults.adapter = (config) => {
    if (config.url.includes('tsuzuki.top')) return Promise.resolve({
      data: { ok: true, episodes: [{ title: 'Teste rápido', mediaId: 123, episode: 1, airingAtIso: new Date(airingAt * 1000).toISOString(), platform: 'Streaming' }] },
      status: 200, config,
    })
    return new Promise((resolve) => {
      finishAniList = () => resolve({
        data: { data: { Page: { pageInfo: { hasNextPage: false }, airingSchedules: [{ airingAt, episode: 1, media: { id: 123, idMal: 123, title: { romaji: 'Teste rápido' }, coverImage: { large: 'https://example.test/cover.jpg' }, status: 'RELEASING' } }] } } },
        status: 200, config,
      })
    })
  }
  try {
    const updates = []
    const request = getAggregatedWeeklySchedule({ forceRefresh: true, onUpdate: (value) => updates.push(value) })
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(updates[0].items.length, 1)
    assert.equal(updates[0].updating, true)
    finishAniList()
    const result = await request
    assert.equal(result.items.length, 1)
    assert.equal(result.updating, false)
    assert.equal(updates.at(-1).items.length, 1)
    assert.ok(globalThis.localStorage.values.size > 0)
  } finally {
    axios.defaults.adapter = oldAdapter
    globalThis.localStorage = oldLocal
    globalThis.sessionStorage = oldSession
  }
})

test('agenda antiga aparece imediatamente enquanto as APIs atualizam', async () => {
  const oldLocal = globalThis.localStorage
  const oldSession = globalThis.sessionStorage
  const oldAdapter = axios.defaults.adapter
  const local = new MemoryStorage()
  globalThis.localStorage = local
  globalThis.sessionStorage = new MemoryStorage()
  const range = getWeekRange()
  const key = `anical:weekly:v8:${range.startDate}:America/Sao_Paulo`
  local.setItem(key, JSON.stringify({ timestamp: Date.now() - 20 * 60_000, data: {
    items: [{ id: 'cached', title: 'Anime salvo', weekday: 'monday' }], range,
    partial: false, sourceStatus: {}, updatedAt: new Date().toISOString(),
  } }))
  axios.defaults.adapter = () => new Promise(() => {})
  const controller = new AbortController()
  try {
    const updates = []
    const request = getAggregatedWeeklySchedule({ signal: controller.signal, onUpdate: (value) => updates.push(value) })
    assert.equal(updates[0].items[0].title, 'Anime salvo')
    assert.equal(updates[0].updating, true)
    assert.equal(updates[0].stale, true)
    controller.abort(new DOMException('Cancelado.', 'AbortError'))
    await assert.rejects(request, { name: 'AbortError' })
  } finally {
    axios.defaults.adapter = oldAdapter
    globalThis.localStorage = oldLocal
    globalThis.sessionStorage = oldSession
  }
})

test('temporada mostra AniList antes do Jikan e combina sem duplicar', async () => {
  const oldLocal = globalThis.localStorage
  const oldSession = globalThis.sessionStorage
  const oldAdapter = axios.defaults.adapter
  globalThis.localStorage = new MemoryStorage()
  globalThis.sessionStorage = new MemoryStorage()
  let finishJikan
  axios.defaults.adapter = (config) => {
    if (config.url.includes('graphql.anilist.co')) return Promise.resolve({
      data: { data: { Page: { pageInfo: { hasNextPage: false }, media: [{
        id: 10, idMal: 20, title: { romaji: 'Anime de teste' }, coverImage: { large: 'https://example.test/high.jpg' },
        season: 'WINTER', seasonYear: 2027, format: 'TV', status: 'NOT_YET_RELEASED',
        startDate: { year: 2027, month: 1, day: 5 }, genres: [], studios: { nodes: [] }, relations: { edges: [] },
      }] } } }, status: 200, config,
    })
    return new Promise((resolve) => {
      finishJikan = () => resolve({
        data: { data: [{ mal_id: 20, title: 'Anime de teste', type: 'TV', season: 'winter', year: 2027, aired: { from: '2027-01-05T00:00:00Z' }, images: { jpg: { large_image_url: 'https://example.test/low.jpg' } }, genres: [], explicit_genres: [], studios: [] }], pagination: { has_next_page: false } },
        status: 200, config,
      })
    })
  }
  try {
    const updates = []
    const request = getSeasonAnime({ year: 2027, season: 'winter', onUpdate: (value) => updates.push(value) })
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(updates[0].data.length, 1)
    assert.equal(updates[0].updating, true)
    assert.equal(updates[0].data[0].coverImage, 'https://example.test/high.jpg')
    finishJikan()
    const result = await request
    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].malId, 20)
    assert.equal(result.data[0].coverImage, 'https://example.test/high.jpg')
    assert.equal(result.updating, false)
  } finally {
    axios.defaults.adapter = oldAdapter
    globalThis.localStorage = oldLocal
    globalThis.sessionStorage = oldSession
  }
})
