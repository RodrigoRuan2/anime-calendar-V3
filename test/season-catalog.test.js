import test from 'node:test'
import assert from 'node:assert/strict'
import { getSeasonForDate, getReleaseLabel, getSeasonLabel, shiftSeason } from '../src/utils/season.js'
import { combineSeasonSources } from '../src/services/seasonCatalogApi.js'
import { getAnimeKey } from '../src/utils/animeKey.js'
import { cleanSynopsis, getSynopsisPreview } from '../src/services/translationApi.js'

const fall2026 = { year: 2026, season: 'fall' }

function aniListAnime(overrides = {}) {
  return {
    id: 10,
    idMal: 20,
    title: { romaji: 'Exemplo Anime', english: 'Example Anime' },
    coverImage: { large: 'https://example.test/poster.jpg' },
    season: 'FALL', seasonYear: 2026, format: 'TV', status: 'NOT_YET_RELEASED',
    startDate: { year: 2026, month: 10, day: 5 }, genres: [], studios: { nodes: [] }, relations: { edges: [] },
    ...overrides,
  }
}

function jikanAnime(overrides = {}) {
  return {
    mal_id: 20, title: 'Exemplo Anime', title_english: 'Example Anime', type: 'TV', season: 'fall', year: 2026,
    aired: { from: '2026-10-05T00:00:00+00:00' }, images: { jpg: { large_image_url: 'https://example.test/jikan.jpg' } },
    genres: [], explicit_genres: [], studios: [],
    ...overrides,
  }
}

test('setembro de 2026 é Summer e a próxima estação é Fall', () => {
  assert.deepEqual(getSeasonForDate(new Date('2026-09-14T12:00:00-03:00')), { year: 2026, season: 'summer' })
  assert.deepEqual(shiftSeason({ year: 2026, season: 'summer' }, 1), fall2026)
  assert.deepEqual(shiftSeason({ year: 2026, season: 'fall' }, 1), { year: 2027, season: 'winter' })
  assert.equal(getSeasonLabel(fall2026), 'Outono 2026')
})

test('combina AniList e Jikan sem duplicar, priorizando dados AniList', () => {
  const catalog = combineSeasonSources({ aniList: [aniListAnime()], jikan: [jikanAnime()] }, fall2026)
  assert.equal(catalog.length, 1)
  assert.equal(catalog[0].anilistId, 10)
  assert.equal(catalog[0].malId, 20)
  assert.equal(catalog[0].coverImage, 'https://example.test/poster.jpg')
  assert.equal(catalog[0].releaseConfirmation, 'CONFIRMED_DATE')
  assert.equal(getReleaseLabel(catalog[0], fall2026), '5 OUT')
})

test('mantém catálogo quando uma fonte ou agenda não retorna dados', () => {
  const catalog = combineSeasonSources({ aniList: [aniListAnime()], jikan: [], schedule: [] }, fall2026)
  assert.equal(catalog.length, 1)
  assert.equal(catalog[0].schedule, null)
})

test('exclui música e filme, mas mantém ONA; identifica continuação', () => {
  const catalog = combineSeasonSources({
    aniList: [
      aniListAnime({ id: 1, idMal: 1, title: { romaji: 'Música' }, format: 'MUSIC' }),
      aniListAnime({ id: 2, idMal: 2, title: { romaji: 'Filme' }, format: 'MOVIE' }),
      aniListAnime({ id: 3, idMal: 3, title: { romaji: 'ONA Válido' }, format: 'ONA' }),
      aniListAnime({ id: 4, idMal: 4, title: { romaji: 'Em andamento' }, startDate: { year: 2026, month: 4, day: 1 } }),
    ],
  }, fall2026)
  assert.deepEqual(catalog.map((anime) => anime.title), ['Em andamento', 'ONA Válido'])
  assert.equal(catalog.find((anime) => anime.title === 'Em andamento').releaseType, 'continuing')
})

test('chave de status mantém compatibilidade com MAL normalizado', () => {
  assert.equal(getAnimeKey({ malId: 123, anilistId: 456 }), 123)
})

test('limpa HTML antes de traduzir a sinopse exibida no card', () => {
  assert.equal(cleanSynopsis('The <i>second</i><br>part &amp; more.'), 'The second part & more.')
  assert.equal(getSynopsisPreview('A'.repeat(440)).endsWith('…'), true)
})
