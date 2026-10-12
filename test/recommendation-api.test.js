import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAnimeRecommendations, matchesDiscoveryFilters, normalizeRecommendation,
  rankByFavoriteTaste, recommendationReasons, recommendationVariables,
} from '../src/services/recommendationApi.js'

const base = {
  genres: ['Comedy'], excludedGenres: [], genreMode: 'all', topic: 'all',
  score: '0', format: 'all', status: 'all', release: 'all',
  yearStart: '', yearEnd: '', maxEpisodes: '0', maxMinutes: '0',
  season: 'all', source: 'all', platform: 'all', sort: 'score',
}

test('busca com limites inclusivos e filtra Isekai + Comédia + nota 9', () => {
  const filters = { ...base, genres: ['Comedy', 'Fantasy'], topic: 'Isekai', score: '9', format: 'TV', yearStart: '2020', yearEnd: '2025', maxEpisodes: '24', status: 'FINISHED', excludeSaved: true }
  const vars = recommendationVariables(filters, 2, new Date(2026, 9, 11))
  assert.equal(vars.page, 2)
  assert.equal(vars.genre, 'Comedy')
  assert.equal(vars.tag, 'Isekai')
  assert.equal(vars.minimumTagRank, 50)
  assert.equal(vars.minimumScore, 89)
  assert.deepEqual(vars.formats, ['TV'])
  assert.equal(vars.status, 'FINISHED')
  assert.equal(vars.startAfter, 20191231)
  assert.equal(vars.startBefore, 20260101)
  assert.equal(vars.maxEpisodes, 25)
  assert.deepEqual(vars.sort, ['SCORE_DESC', 'POPULARITY_DESC'])

  const anime = normalizeRecommendation({ id: 1, title: { romaji: 'Exemplo' }, averageScore: 90, genres: ['Comedy', 'Fantasy'], tags: [{ name: 'Isekai', rank: 90 }], episodes: 12 })
  assert.equal(matchesDiscoveryFilters(anime, filters), true)
  assert.equal(matchesDiscoveryFilters(anime, filters, { savedIds: new Set(['1']) }), false)
  assert.deepEqual(recommendationReasons(anime, filters), ['Isekai', 'Comedy', 'Fantasy', '★ 9.0'])
})

test('combina gêneros com E ou OU e exclui gêneros indesejados', () => {
  const anime = normalizeRecommendation({ id: 2, title: { romaji: 'Exemplo' }, genres: ['Comedy', 'Drama'], episodes: 24 })
  const filters = { ...base, genres: ['Comedy', 'Fantasy'] }
  assert.equal(matchesDiscoveryFilters(anime, filters), false)
  assert.equal(matchesDiscoveryFilters(anime, { ...filters, genreMode: 'any' }), true)
  assert.deepEqual(recommendationVariables({ ...filters, genreMode: 'any' }).genres, ['Comedy', 'Fantasy'])
  assert.equal(recommendationVariables({ ...filters, genreMode: 'any' }).genre, null)
  assert.equal(matchesDiscoveryFilters(anime, { ...filters, genreMode: 'any', excludedGenres: ['Drama'] }), false)
})

test('estreia, duração, origem, estação e plataforma geram filtros reais', () => {
  const now = new Date(2026, 9, 11)
  const filters = { ...base, release: 'released', yearStart: '2020', yearEnd: '2026', maxMinutes: '25', season: 'SPRING', source: 'MANGA', platform: 'Crunchyroll' }
  const vars = recommendationVariables(filters, 1, now)
  assert.equal(vars.startAfter, 20191231)
  assert.equal(vars.startBefore, 20261012)
  assert.equal(vars.maxMinutes, 26)
  assert.equal(vars.season, 'SPRING')
  assert.equal(vars.source, 'MANGA')
  assert.equal(vars.licensedBy, 'Crunchyroll')
  assert.equal(recommendationVariables({ ...filters, release: 'upcoming' }, 1, now).startAfter, 20261011)
  assert.equal(recommendationVariables({ ...filters, format: 'all' }).formats, null)
  assert.deepEqual(recommendationVariables({ ...filters, format: 'OVA' }).formats, ['OVA'])
})

test('tema secundário, concluídos, continuações e plataforma filtram resultados', () => {
  const anime = normalizeRecommendation({ id: 3, title: { romaji: 'Exemplo' }, genres: ['Comedy'], tags: [{ name: 'School', rank: 30 }], duration: 24, externalLinks: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/a', type: 'STREAMING' }], relations: { edges: [{ relationType: 'PREQUEL', node: { id: 2 } }] } })
  const filters = { ...base, topic: 'School', platform: 'Crunchyroll', maxMinutes: '25', avoidUnstartedSequels: true, excludeCompleted: true }
  assert.equal(matchesDiscoveryFilters(anime, filters), false)
  assert.equal(matchesDiscoveryFilters(anime, { ...filters, topicStrength: 'any' }, { completedIds: new Set(['2']) }), true)
  assert.equal(matchesDiscoveryFilters(anime, { ...filters, topicStrength: 'any' }, { completedIds: new Set(['2', '3']) }), false)
  assert.equal(matchesDiscoveryFilters(anime, { ...filters, topicStrength: 'any', platform: 'Netflix', avoidUnstartedSequels: false, excludeCompleted: false }), false)
})

test('joias escondidas e favoritos usam critérios transparentes', () => {
  const vars = recommendationVariables({ ...base, sort: 'hidden' })
  assert.equal(vars.minimumScore, 74)
  assert.equal(vars.maximumPopularity, 20000)
  const taste = { genres: { Comedy: 2 }, tags: { School: 1 }, preferredGenres: ['Comedy'] }
  const ranked = rankByFavoriteTaste([
    normalizeRecommendation({ id: 1, title: { romaji: 'Outro' }, genres: ['Action'], averageScore: 90 }),
    normalizeRecommendation({ id: 2, title: { romaji: 'Meu estilo' }, genres: ['Comedy'], tags: [{ name: 'School', rank: 90 }], averageScore: 80 }),
  ], taste)
  assert.equal(ranked[0].title, 'Meu estilo')
  assert.equal(recommendationVariables({ ...base, genres: [], sort: 'forYou' }, 1, new Date(), taste).genre, 'Comedy')
  assert.equal(matchesDiscoveryFilters(ranked[0], { ...base, sort: 'forYou' }, { favoriteIds: new Set(['2']) }), false)
})

test('carrega a próxima página da AniList em vez de repetir os primeiros títulos', async () => {
  const originalFetch = globalThis.fetch
  const requestedPages = []
  globalThis.fetch = async (_url, options) => {
    const page = JSON.parse(options.body).variables.page
    requestedPages.push(page)
    return { ok: true, status: 200, json: async () => ({ data: { Page: {
      pageInfo: { hasNextPage: page < 3 },
      media: Array.from({ length: 50 }, (_, index) => ({ id: page * 100 + index, title: { romaji: `Anime ${page}-${index}` }, genres: ['Comedy'] })),
    } } }) }
  }
  try {
    const first = await getAnimeRecommendations(base)
    const second = await getAnimeRecommendations(base, { startPage: first.nextPage })
    assert.deepEqual(requestedPages, [1, 2])
    assert.equal(first.items.length, 50)
    assert.equal(second.items.length, 50)
    assert.equal(second.nextPage, 3)
    assert.notEqual(first.items[0].id, second.items[0].id)
  } finally {
    globalThis.fetch = originalFetch
  }
})
