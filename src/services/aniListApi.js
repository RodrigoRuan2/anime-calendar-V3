const ANILIST_URL = 'https://graphql.anilist.co'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const DETAILS_QUERY = `
  query ($search: String!) {
    Page(page: 1, perPage: 1) {
      media(search: $search, type: ANIME) {
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
      }
    }
  }
`

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

function cacheKey(title) {
  return `anical_anilist_${title.toLowerCase().trim()}`
}

function getCachedDetails(title) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(title)))
    if (!cached || Date.now() - cached.timestamp > CACHE_TTL_MS) return null
    return cached.data
  } catch {
    return null
  }
}

function cacheDetails(title, data) {
  try {
    sessionStorage.setItem(cacheKey(title), JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // O modal continua funcional se o armazenamento não estiver disponível.
  }
}

export async function getAniListDetails(title, signal) {
  if (!title) return null

  const cached = getCachedDetails(title)
  if (cached) return cached

  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: DETAILS_QUERY, variables: { search: title } }),
  })

  if (!response.ok) throw new Error('Não foi possível consultar a AniList.')

  const payload = await response.json()
  const data = payload.data?.Page?.media?.[0] ?? null
  if (data) cacheDetails(title, data)
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
