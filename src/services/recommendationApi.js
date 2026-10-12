import { getStreamingLinks } from '../utils/streamingLinks.js'

const ANILIST_URL = 'https://graphql.anilist.co'
const PAGE_SIZE = 50
const MAX_PAGES_PER_LOAD = 4
const MAX_API_PAGE = 100 // Limite de profundidade da AniList: 5.000 posições.

const FILTER_ARGUMENTS = {
  genre: ['String', 'genre'], genres: ['[String]', 'genre_in'],
  excludedGenres: ['[String]', 'genre_not_in'],
  tag: ['String', 'tag'], minimumTagRank: ['Int', 'minimumTagRank'],
  minimumScore: ['Int', 'averageScore_greater'], maximumPopularity: ['Int', 'popularity_lesser'],
  formats: ['[MediaFormat]', 'format_in'], status: ['MediaStatus', 'status'],
  startAfter: ['FuzzyDateInt', 'startDate_greater'], startBefore: ['FuzzyDateInt', 'startDate_lesser'],
  maxEpisodes: ['Int', 'episodes_lesser'], maxMinutes: ['Int', 'duration_lesser'],
  season: ['MediaSeason', 'season'], source: ['MediaSource', 'source'],
  licensedBy: ['String', 'licensedBy'], sort: ['[MediaSort]', 'sort'],
}

function discoverQuery(variables) {
  const active = Object.entries(FILTER_ARGUMENTS).filter(([name]) => variables[name] != null)
  const definitions = active.map(([name, [type]]) => `$${name}: ${type}`).join(', ')
  const argumentsList = active.map(([name, [, argument]]) => `${argument}: $${name}`).join(', ')
  return `query ($page: Int!, ${definitions}) {
    Page(page: $page, perPage: ${PAGE_SIZE}) {
      pageInfo { hasNextPage }
      media(type: ANIME, isAdult: false, ${argumentsList}) {
        id idMal title { romaji english native }
        coverImage { large medium } bannerImage
        averageScore popularity trending episodes duration status format genres
        tags { name rank }
        externalLinks { site url type isDisabled }
        startDate { year month day }
        season source(version: 2)
        relations { edges { relationType node { id } } }
      }
    }
  }`
}

const TASTE_QUERY = `query ($ids: [Int]) {
  Page(page: 1, perPage: 25) {
    media(id_in: $ids, type: ANIME) { genres tags { name rank } }
  }
}`

export const DISCOVER_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports',
  'Supernatural', 'Thriller',
]

export const DISCOVER_TOPICS = [
  { value: 'all', label: 'Qualquer tema' },
  { value: 'Isekai', label: 'Isekai' },
  { value: 'Reincarnation', label: 'Reencarnação' },
  { value: 'Time Travel', label: 'Viagem no tempo' },
  { value: 'School', label: 'Escola' },
  { value: 'Magic', label: 'Magia' },
]

export const DISCOVER_FORMATS = [
  { value: 'all', label: 'Todos os formatos' },
  { value: 'series', label: 'Séries' },
  { value: 'TV', label: 'TV' },
  { value: 'ONA', label: 'Online (ONA)' },
  { value: 'MOVIE', label: 'Filmes' },
  { value: 'OVA', label: 'OVA' },
  { value: 'SPECIAL', label: 'Especiais' },
]

export const DISCOVER_FORMAT_LABELS = {
  TV: 'Série', TV_SHORT: 'Série curta', ONA: 'Online',
  MOVIE: 'Filme', OVA: 'OVA', SPECIAL: 'Especial', MUSIC: 'Clipe',
}

export const DISCOVER_STATUSES = [
  { value: 'all', label: 'Qualquer situação' },
  { value: 'FINISHED', label: 'Finalizados' },
  { value: 'RELEASING', label: 'Em exibição' },
  { value: 'NOT_YET_RELEASED', label: 'Ainda não lançados' },
]

export const DISCOVER_SOURCES = [
  { value: 'all', label: 'Qualquer origem' },
  { value: 'ORIGINAL', label: 'Original' },
  { value: 'MANGA', label: 'Mangá' },
  { value: 'LIGHT_NOVEL', label: 'Light novel' },
  { value: 'NOVEL', label: 'Romance' },
  { value: 'WEB_NOVEL', label: 'Web novel' },
  { value: 'VISUAL_NOVEL', label: 'Visual novel' },
  { value: 'VIDEO_GAME', label: 'Videogame' },
]

export const DISCOVER_PLATFORMS = [
  { value: 'all', label: 'Qualquer plataforma' },
  { value: 'Crunchyroll', label: 'Crunchyroll' },
  { value: 'Netflix', label: 'Netflix' },
  { value: 'HIDIVE', label: 'HIDIVE' },
  { value: 'Amazon Prime Video', label: 'Prime Video' },
  { value: 'YouTube', label: 'YouTube' },
]

function dateNumber(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

export function recommendationVariables(filters, page = 1, now = new Date(), taste = null) {
  const minYear = Number(filters.yearStart)
  const maxYear = Number(filters.yearEnd)
  const score = Number(filters.score)
  const maxEpisodes = Number(filters.maxEpisodes)
  const maxMinutes = Number(filters.maxMinutes)
  const selectedGenres = filters.genres || []
  const anyGenre = filters.genreMode === 'any'
  const firstGenre = selectedGenres[0] || (filters.genre && filters.genre !== 'all' ? filters.genre : null)
  const yearStart = minYear > 0 ? (minYear - 1) * 10000 + 1231 : null
  const yearEnd = maxYear > 0 ? (maxYear + 1) * 10000 + 101 : null
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const startAfter = filters.release === 'upcoming' ? dateNumber(now) : null
  const startBefore = filters.release === 'released' ? dateNumber(tomorrow) : null
  const sortOptions = {
    popular: ['POPULARITY_DESC', 'SCORE_DESC'],
    recent: ['START_DATE_DESC', 'POPULARITY_DESC'],
    trending: ['TRENDING_DESC', 'POPULARITY_DESC'],
    hidden: ['SCORE_DESC', 'POPULARITY_DESC'],
    forYou: ['POPULARITY_DESC', 'SCORE_DESC'],
  }

  return {
    page,
    genre: anyGenre ? null : firstGenre || (filters.sort === 'forYou' ? taste?.preferredGenres?.[0] || null : null),
    genres: anyGenre && selectedGenres.length ? selectedGenres : null,
    excludedGenres: filters.excludedGenres?.length ? filters.excludedGenres : null,
    tag: filters.topic && filters.topic !== 'all' ? filters.topic : null,
    minimumTagRank: filters.topic && filters.topic !== 'all' ? filters.topicStrength === 'any' ? 18 : 50 : null,
    minimumScore: score > 0 || filters.sort === 'hidden' ? Math.round(Math.max(score, filters.sort === 'hidden' ? 7.5 : 0) * 10) - 1 : null,
    maximumPopularity: filters.sort === 'hidden' ? 20000 : null,
    formats: filters.format === 'series' ? ['TV', 'TV_SHORT', 'ONA']
      : !filters.format || filters.format === 'all' ? null : [filters.format],
    status: filters.status && filters.status !== 'all' ? filters.status : null,
    startAfter: startAfter == null ? yearStart : yearStart == null ? startAfter : Math.max(startAfter, yearStart),
    startBefore: startBefore == null ? yearEnd : yearEnd == null ? startBefore : Math.min(startBefore, yearEnd),
    maxEpisodes: maxEpisodes > 0 ? maxEpisodes + 1 : null,
    maxMinutes: maxMinutes > 0 ? maxMinutes + 1 : null,
    season: filters.season && filters.season !== 'all' ? filters.season : null,
    source: filters.source && filters.source !== 'all' ? filters.source : null,
    licensedBy: filters.platform && filters.platform !== 'all' ? filters.platform : null,
    sort: sortOptions[filters.sort] || ['SCORE_DESC', 'POPULARITY_DESC'],
  }
}

export function normalizeRecommendation(media) {
  return {
    id: `anilist:${media.id}`,
    anilistId: media.id,
    malId: media.idMal || null,
    title: media.title?.romaji || media.title?.english || media.title?.native || 'Sem título',
    titleEnglish: media.title?.english || null,
    titleRomaji: media.title?.romaji || null,
    titleNative: media.title?.native || null,
    coverImage: media.coverImage?.large || media.coverImage?.medium || null,
    bannerImage: media.bannerImage || null,
    score: media.averageScore ? media.averageScore / 10 : null,
    scoreSource: media.averageScore ? 'AniList' : null,
    popularity: media.popularity || 0,
    trending: media.trending || 0,
    episodes: media.episodes || null,
    duration: media.duration || null,
    status: media.status || null,
    format: media.format || null,
    genres: media.genres || [],
    tags: (media.tags || []).filter((tag) => tag.rank >= 18).map((tag) => ({ name: tag.name, rank: tag.rank })),
    startDate: media.startDate?.year ? media.startDate : null,
    season: media.season || null,
    source: media.source || null,
    prequelIds: (media.relations?.edges || []).filter((edge) => edge.relationType === 'PREQUEL').map((edge) => edge.node?.id).filter(Boolean),
    streams: getStreamingLinks({ externalLinks: media.externalLinks || [] }),
  }
}

export function matchesDiscoveryFilters(anime, filters, { savedIds = new Set(), completedIds = new Set(), favoriteIds = new Set() } = {}) {
  const genres = filters.genres || []
  if (genres.length && (filters.genreMode === 'any'
    ? !genres.some((genre) => anime.genres.includes(genre))
    : genres.some((genre) => !anime.genres.includes(genre)))) return false
  if (filters.excludedGenres?.some((genre) => anime.genres.includes(genre))) return false
  if (filters.topic && filters.topic !== 'all' && !anime.tags.some((tag) => tag.name === filters.topic && tag.rank >= (filters.topicStrength === 'any' ? 18 : 50))) return false
  if (Number(filters.score) > 0 && (!anime.score || anime.score < Number(filters.score))) return false
  if (Number(filters.maxEpisodes) > 0 && (!anime.episodes || anime.episodes > Number(filters.maxEpisodes))) return false
  if (Number(filters.maxMinutes) > 0 && (!anime.duration || anime.duration > Number(filters.maxMinutes))) return false
  if (filters.platform && filters.platform !== 'all' && !anime.streams.some((stream) => stream.name.toLowerCase() === filters.platform.toLowerCase())) return false
  if (filters.excludeSaved && savedIds.has(String(anime.anilistId))) return false
  if (filters.excludeCompleted && completedIds.has(String(anime.anilistId))) return false
  if (filters.sort === 'forYou' && favoriteIds.has(String(anime.anilistId))) return false
  if (filters.avoidUnstartedSequels && anime.prequelIds.some((id) => !completedIds.has(String(id)))) return false
  return true
}

export function recommendationReasons(anime, filters) {
  const reasons = []
  if (filters.sort === 'forYou' && anime.affinity > 0) reasons.push('Combina com seus favoritos')
  if (filters.topic !== 'all' && anime.tags.some((tag) => tag.name === filters.topic)) {
    reasons.push(DISCOVER_TOPICS.find((item) => item.value === filters.topic)?.label || filters.topic)
  }
  for (const genre of filters.genres || []) {
    if (anime.genres.includes(genre)) reasons.push(genre)
  }
  if (Number(filters.score) > 0 && anime.score >= Number(filters.score)) reasons.push(`★ ${anime.score.toFixed(1)}`)
  return reasons
}

async function aniListRequest(query, variables, signal) {
  const response = await fetch(ANILIST_URL, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json()
  if (response.status === 429) throw new Error('A AniList limitou as consultas. Aguarde um minuto e tente novamente.')
  if (payload.errors?.length) throw new Error(payload.errors[0].message || 'Não foi possível consultar a AniList agora.')
  if (!response.ok) throw new Error(`Não foi possível consultar a AniList agora (${response.status}).`)
  return payload.data
}

export async function getFavoriteTaste(entries, signal) {
  const ids = entries.filter((entry) => entry.is_favorite).map((entry) => Number(entry.anilist_id)).filter(Number.isInteger).slice(0, 25)
  if (!ids.length) return null
  const data = await aniListRequest(TASTE_QUERY, { ids }, signal)
  const genres = {}
  const tags = {}
  for (const media of data?.Page?.media || []) {
    for (const genre of media.genres || []) genres[genre] = (genres[genre] || 0) + 1
    for (const tag of media.tags || []) {
      if (tag.rank >= 50) tags[tag.name] = (tags[tag.name] || 0) + 1
    }
  }
  const preferredGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre)
  return { genres, tags, preferredGenres, sourceIds: ids }
}

export function rankByFavoriteTaste(items, taste) {
  if (!taste) return items
  return items.map((anime) => ({
    ...anime,
    affinity: anime.genres.reduce((sum, genre) => sum + (taste.genres[genre] || 0) * 3, 0)
      + anime.tags.reduce((sum, tag) => sum + (taste.tags[tag.name] || 0) * (tag.rank / 100), 0),
  })).sort((a, b) => b.affinity - a.affinity || (b.score || 0) - (a.score || 0) || b.popularity - a.popularity)
}

export async function getAnimeRecommendations(filters, {
  signal, savedIds = new Set(), completedIds = new Set(),
  startPage = 1, taste = null, now = new Date(),
} = {}) {
  const found = []
  const seen = new Set()
  const favoriteIds = new Set((taste?.sourceIds || []).map(String))
  let pagesChecked = 0
  let nextPage = startPage

  while (nextPage && pagesChecked < MAX_PAGES_PER_LOAD) {
    const page = nextPage
    const variables = recommendationVariables(filters, page, now, taste)
    const data = await aniListRequest(discoverQuery(variables), variables, signal)
    const items = data?.Page?.media || []
    pagesChecked += 1
    for (const media of items) {
      if (seen.has(media.id)) continue
      seen.add(media.id)
      const anime = normalizeRecommendation(media)
      if (matchesDiscoveryFilters(anime, filters, { savedIds, completedIds, favoriteIds })) found.push(anime)
    }
    nextPage = data?.Page?.pageInfo?.hasNextPage && page < MAX_API_PAGE ? page + 1 : null
    if (found.length >= 24) break
  }

  return { items: filters.sort === 'forYou' ? rankByFavoriteTaste(found, taste) : found,
    nextPage, pagesChecked, candidatesChecked: seen.size }
}
