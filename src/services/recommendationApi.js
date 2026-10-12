const ANILIST_URL = 'https://graphql.anilist.co'
const MAX_PAGES = 4

const FILTER_ARGUMENTS = {
  genre: ['String', 'genre'], tag: ['String', 'tag'],
  minimumTagRank: ['Int', 'minimumTagRank'],
  minimumScore: ['Int', 'averageScore_greater'],
  formats: ['[MediaFormat]', 'format_in'],
  status: ['MediaStatus', 'status'],
  yearStart: ['FuzzyDateInt', 'startDate_greater'],
  yearEnd: ['FuzzyDateInt', 'startDate_lesser'],
  maxEpisodes: ['Int', 'episodes_lesser'],
  sort: ['[MediaSort]', 'sort'],
}

function discoverQuery(variables) {
  const active = Object.entries(FILTER_ARGUMENTS).filter(([name]) => variables[name] !== null)
  const definitions = active.map(([name, [type]]) => `$${name}: ${type}`).join(', ')
  const argumentsList = active.map(([name, [, argument]]) => `${argument}: $${name}`).join(', ')
  return `query ($page: Int!, ${definitions}) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(
        type: ANIME, isAdult: false, ${argumentsList}
      ) {
        id idMal title { romaji english native }
        coverImage { large medium } bannerImage
        description(asHtml: false) averageScore popularity
        episodes status format genres
        tags { name rank }
        startDate { year month day }
      }
    }
  }
`
}

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

export function recommendationVariables(filters, page = 1) {
  const minYear = Number(filters.yearStart)
  const maxYear = Number(filters.yearEnd)
  const score = Number(filters.score)
  const maxEpisodes = Number(filters.maxEpisodes)
  const format = filters.format || 'all'

  return {
    page,
    genre: filters.genres?.[0] || (filters.genre && filters.genre !== 'all' ? filters.genre : null),
    tag: filters.topic && filters.topic !== 'all' ? filters.topic : null,
    minimumTagRank: filters.topic && filters.topic !== 'all' ? 50 : null,
    minimumScore: score > 0 ? Math.round(score * 10) - 1 : null,
    formats: format === 'series' ? ['TV', 'TV_SHORT', 'ONA']
      : format === 'all' ? null : [format],
    status: filters.status && filters.status !== 'all' ? filters.status : null,
    yearStart: minYear > 0 ? (minYear - 1) * 10000 + 1231 : null,
    yearEnd: maxYear > 0 ? (maxYear + 1) * 10000 + 101 : null,
    maxEpisodes: maxEpisodes > 0 ? maxEpisodes + 1 : null,
    sort: filters.sort === 'popular' ? ['POPULARITY_DESC', 'SCORE_DESC'] : ['SCORE_DESC', 'POPULARITY_DESC'],
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
    description: media.description || null,
    score: media.averageScore ? media.averageScore / 10 : null,
    scoreSource: media.averageScore ? 'AniList' : null,
    popularity: media.popularity || 0,
    episodes: media.episodes || null,
    status: media.status || null,
    format: media.format || null,
    genres: media.genres || [],
    tags: (media.tags || []).filter((tag) => tag.rank >= 50).map((tag) => tag.name),
    startDate: media.startDate?.year ? media.startDate : null,
    streams: [],
  }
}

export function matchesDiscoveryFilters(anime, filters, savedIds = new Set()) {
  if (filters.genres?.some((genre) => !anime.genres.includes(genre))) return false
  if (filters.topic !== 'all' && !anime.tags.includes(filters.topic)) return false
  if (Number(filters.score) > 0 && (!anime.score || anime.score < Number(filters.score))) return false
  if (Number(filters.maxEpisodes) > 0 && (!anime.episodes || anime.episodes > Number(filters.maxEpisodes))) return false
  if (filters.excludeSaved && savedIds.has(String(anime.anilistId))) return false
  return true
}

export function recommendationReasons(anime, filters) {
  const reasons = []
  if (filters.topic !== 'all' && anime.tags.includes(filters.topic)) {
    reasons.push(DISCOVER_TOPICS.find((item) => item.value === filters.topic)?.label || filters.topic)
  }
  for (const genre of filters.genres || []) {
    if (anime.genres.includes(genre)) reasons.push(genre)
  }
  if (Number(filters.score) > 0 && anime.score >= Number(filters.score)) reasons.push(`★ ${anime.score.toFixed(1)}`)
  return reasons
}

export async function getAnimeRecommendations(filters, { signal, savedIds = new Set() } = {}) {
  const found = []
  const seen = new Set()
  let pagesChecked = 0

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const variables = recommendationVariables(filters, page)
    const response = await fetch(ANILIST_URL, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: discoverQuery(variables), variables }),
    })
    const payload = await response.json()
    if (response.status === 429) throw new Error('A AniList limitou as consultas. Aguarde um minuto e tente novamente.')
    if (payload.errors?.length) throw new Error(payload.errors[0].message || 'Não foi possível consultar a AniList agora.')
    if (!response.ok) throw new Error(`Não foi possível consultar a AniList agora (${response.status}).`)
    const items = payload.data?.Page?.media || []
    pagesChecked += 1
    for (const media of items) {
      if (seen.has(media.id)) continue
      seen.add(media.id)
      const anime = normalizeRecommendation(media)
      if (matchesDiscoveryFilters(anime, filters, savedIds)) found.push(anime)
    }
    if (!payload.data?.Page?.pageInfo?.hasNextPage || found.length >= 36) break
  }

  return { items: found, pagesChecked, candidatesChecked: seen.size }
}
