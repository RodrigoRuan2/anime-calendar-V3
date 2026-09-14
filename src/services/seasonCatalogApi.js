import axios from 'axios'
import { getSeasonForDate } from '../utils/season.js'
import { enrichWithSchedule, mergeAnimeCatalogs, normalizeAniListAnime, normalizeJikanAnime } from '../utils/normalizeAnime.js'

const ANILIST_URL = 'https://graphql.anilist.co'
const JIKAN_URL = 'https://api.jikan.moe/v4'
const CURRENT_CACHE_TTL = 2 * 60 * 60 * 1000
const FUTURE_CACHE_TTL = 6 * 60 * 60 * 1000
const MAX_PAGES = 20

const ANILIST_SEASON_QUERY = `query ($page: Int!, $season: MediaSeason, $seasonYear: Int!) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
      id idMal title { romaji english native } coverImage { large medium } bannerImage
      season seasonYear format status episodes startDate { year month day }
      description(asHtml: false) genres source trailer { id site }
      studios(isMain: true) { nodes { name } } relations { edges { relationType } }
    }
  }
}`

function cacheGet(key, ttl) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > ttl) { sessionStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function cacheSet(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch { /* optional cache */ }
}

async function fetchAniListSeason({ year, season }) {
  const data = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await axios.post(ANILIST_URL, { query: ANILIST_SEASON_QUERY, variables: { page, season: season.toUpperCase(), seasonYear: year } })
    if (response.data?.errors?.length) throw new Error(response.data.errors[0].message)
    const result = response.data?.data?.Page
    data.push(...(result?.media || []))
    if (!result?.pageInfo?.hasNextPage) break
  }
  return data
}

async function fetchJikanSeason({ year, season }) {
  const data = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let response
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await axios.get(`${JIKAN_URL}/seasons/${year}/${season}`, { params: { page, limit: 25 } })
        break
      } catch (error) {
        const retryable = error.response?.status === 429 || error.response?.status >= 500
        if (!retryable || attempt === 2) throw error
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
    data.push(...(response.data?.data || []))
    if (!response.data?.pagination?.has_next_page) break
    await new Promise((resolve) => setTimeout(resolve, 450))
  }
  return data
}

export function combineSeasonSources({ aniList = [], jikan = [], schedule = [] }, targetSeason) {
  const normalizedAniList = aniList.map((anime) => normalizeAniListAnime(anime, targetSeason))
  const normalizedJikan = jikan.map((anime) => normalizeJikanAnime(anime, targetSeason))
  return enrichWithSchedule(mergeAnimeCatalogs([normalizedAniList, normalizedJikan], targetSeason), schedule, targetSeason)
}

/** Catálogo paginado internamente; a UI recebe a temporada completa. */
export async function getSeasonAnime({ year, season, page = 1 }) {
  const targetSeason = { year, season }
  const current = getSeasonForDate()
  const isCurrent = current.year === year && current.season === season
  const cacheKey = `anical:season-catalog:v1:${year}:${season}`
  const cached = cacheGet(cacheKey, isCurrent ? CURRENT_CACHE_TTL : FUTURE_CACHE_TTL)
  if (cached) return { ...cached, page }

  const [aniListResult, jikanResult] = await Promise.allSettled([fetchAniListSeason(targetSeason), fetchJikanSeason(targetSeason)])
  const aniList = aniListResult.status === 'fulfilled' ? aniListResult.value : []
  const jikan = jikanResult.status === 'fulfilled' ? jikanResult.value : []
  if (!aniList.length && !jikan.length) throw new Error('O catálogo da temporada está temporariamente indisponível. Tente novamente em instantes.')

  let schedule = []
  let scheduleAvailable = false
  if (isCurrent) {
    try {
      const { getWeeklyTimetable } = await import('./animeScheduleApi.js')
      schedule = await getWeeklyTimetable()
      scheduleAvailable = true
    } catch { schedule = [] }
  }

  const result = {
    data: combineSeasonSources({ aniList, jikan, schedule }, targetSeason),
    hasNext: false,
    page: 1,
    sourceStatus: { aniList: aniListResult.status === 'fulfilled' ? 'ok' : 'error', jikan: jikanResult.status === 'fulfilled' ? 'ok' : 'error', schedule: scheduleAvailable ? 'ok' : 'unavailable' },
  }
  cacheSet(cacheKey, result)
  return { ...result, page }
}
