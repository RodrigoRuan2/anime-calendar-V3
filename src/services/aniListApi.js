const ANILIST_URL = 'https://graphql.anilist.co'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const DETAILS_FIELDS = `
        id
        title { romaji english native }
        description(asHtml: false)
        coverImage { large medium }
        averageScore
        episodes
        status
        format
        genres
        studios(isMain: true) { nodes { name } }
        externalLinks { site url type isDisabled }
        streamingEpisodes { site url }
`
const DETAILS_BY_ID_QUERY = `query ($id: Int!) { Media(id: $id, type: ANIME) { ${DETAILS_FIELDS} } }`
const DETAILS_BY_TITLE_QUERY = `query ($search: String!) { Media(search: $search, type: ANIME) { ${DETAILS_FIELDS} } }`

const MOVIES_BY_YEAR_QUERY = `
  query ($page: Int!, $yearStart: FuzzyDateInt, $nextYearStart: FuzzyDateInt) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(
        type: ANIME
        format: MOVIE
        startDate_greater: $yearStart
        startDate_lesser: $nextYearStart
        sort: START_DATE
      ) {
        id
        title { romaji english native }
        startDate { year month day }
        coverImage { large medium }
        status
      }
    }
  }
`

function cacheKey(title, id) {
  return `anical_anilist_details_v2_${id || title.toLowerCase().trim()}`
}

function getCachedDetails(title, id) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(title, id)))
    if (!cached || Date.now() - cached.timestamp > CACHE_TTL_MS) return null
    return cached.data
  } catch {
    return null
  }
}

function cacheDetails(title, id, data) {
  try {
    sessionStorage.setItem(cacheKey(title, id), JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // O modal continua funcional se o armazenamento não estiver disponível.
  }
}

export async function getAniListDetails(title, signal, id = null) {
  const anilistId = Number(id) > 0 ? Number(id) : null
  if (!title && !anilistId) return null

  const cached = getCachedDetails(title, anilistId)
  if (cached) return cached

  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(anilistId
      ? { query: DETAILS_BY_ID_QUERY, variables: { id: anilistId } }
      : { query: DETAILS_BY_TITLE_QUERY, variables: { search: title } }),
  })

  if (!response.ok) throw new Error('Não foi possível consultar a AniList.')

  const payload = await response.json()
  const data = payload.data?.Media ?? null
  if (data) cacheDetails(title, anilistId, data)
  return data
}

export async function getAniListMoviesByYear(year) {
  const key = `anical_anilist_movies_${year}`

  try {
    const cached = JSON.parse(sessionStorage.getItem(key))
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data
  } catch {
    // A consulta continua funcionando quando o armazenamento não está disponível.
  }

  const movies = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: MOVIES_BY_YEAR_QUERY,
        variables: { page, yearStart: year * 10000, nextYearStart: (year + 1) * 10000 },
      }),
    })

    if (!response.ok) throw new Error('Não foi possível consultar os filmes na AniList.')

    const payload = await response.json()
    const result = payload.data?.Page
    movies.push(...(result?.media || []))
    hasNextPage = Boolean(result?.pageInfo?.hasNextPage)
    page += 1
  }

  try {
    sessionStorage.setItem(key, JSON.stringify({ data: movies, timestamp: Date.now() }))
  } catch {
    // Sem cache, mas sem impedir a exibição dos filmes.
  }

  return movies
}
