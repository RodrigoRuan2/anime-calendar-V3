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
