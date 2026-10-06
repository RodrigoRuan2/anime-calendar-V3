import axios from 'axios'
import { getSeasonForDate } from '../utils/season.js'
import { enrichWithSchedule, mergeAnimeCatalogs, normalizeAniListAnime, normalizeJikanAnime } from '../utils/normalizeAnime.js'
import { readSnapshot, writeSnapshot } from '../utils/snapshotCache.js'
import { withDeadline } from '../utils/withDeadline.js'

const ANILIST_URL = 'https://graphql.anilist.co'
const JIKAN_URL = 'https://api.jikan.moe/v4'
const CURRENT_CACHE_TTL = 2 * 60 * 60 * 1000
const FUTURE_CACHE_TTL = 6 * 60 * 60 * 1000
const CURRENT_STALE_TTL = 24 * 60 * 60 * 1000
const FUTURE_STALE_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_PAGES = 20

const ANILIST_SEASON_QUERY = `query ($page: Int!, $season: MediaSeason, $seasonYear: Int!) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
      id idMal title { romaji english native } coverImage { large medium } bannerImage
      season seasonYear format status episodes startDate { year month day }
      description(asHtml: false) genres averageScore source trailer { id site }
      studios(isMain: true) { nodes { name } } relations { edges { relationType } }
    }
  }
}`

async function fetchAniListSeason({ year, season }, signal) {
  const data = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await axios.post(ANILIST_URL, { query: ANILIST_SEASON_QUERY, variables: { page, season: season.toUpperCase(), seasonYear: year } }, { signal })
    if (response.data?.errors?.length) throw new Error(response.data.errors[0].message)
    const result = response.data?.data?.Page
    data.push(...(result?.media || []))
    if (!result?.pageInfo?.hasNextPage) break
  }
  return data
}

async function fetchJikanSeason({ year, season }, signal) {
  const data = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let response
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await axios.get(`${JIKAN_URL}/seasons/${year}/${season}`, { params: { page, limit: 25 }, signal })
        break
      } catch (error) {
        const retryable = error.response?.status === 429 || error.response?.status >= 500
        if (signal?.aborted || !retryable || attempt === 2) throw error
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
export async function getSeasonAnime({ year, season, page = 1, onUpdate, signal, forceRefresh = false }) {
  const targetSeason = { year, season }
  const current = getSeasonForDate()
  const isCurrent = current.year === year && current.season === season
  const cacheKey = `anical:season-catalog:v2:${year}:${season}`
  const cached = readSnapshot(cacheKey, isCurrent ? CURRENT_STALE_TTL : FUTURE_STALE_TTL)
  const ttl = cached?.data?.sourceStatus?.aniList === 'ok' && cached?.data?.sourceStatus?.jikan === 'ok'
    ? isCurrent ? CURRENT_CACHE_TTL : FUTURE_CACHE_TTL
    : 10 * 60 * 1000
  if (cached && !forceRefresh && cached.age < ttl) {
    onUpdate?.({ ...cached.data, page, updating: false, stale: false })
    return { ...cached.data, page }
  }
  if (cached) onUpdate?.({ ...cached.data, page, updating: true, stale: true })

  let aniList = []
  let jikan = []
  let schedule = []
  const sourceStatus = { aniList: 'pending', jikan: 'pending', schedule: isCurrent ? 'pending' : 'unavailable' }
  const preview = () => {
    if (cached || signal?.aborted || (!aniList.length && !jikan.length)) return
    onUpdate?.({
      data: combineSeasonSources({ aniList, jikan: aniList.length ? [] : jikan }, targetSeason),
      hasNext: false, page, sourceStatus: { ...sourceStatus }, updating: true, stale: false,
    })
  }

  const aniListTask = withDeadline((requestSignal) => fetchAniListSeason(targetSeason, requestSignal), 12000, signal)
    .then((items) => { aniList = items; sourceStatus.aniList = 'ok'; preview() })
    .catch(() => { sourceStatus.aniList = 'error'; preview() })
  const jikanTask = withDeadline((requestSignal) => fetchJikanSeason(targetSeason, requestSignal), 15000, signal)
    .then((items) => { jikan = items; sourceStatus.jikan = 'ok'; if (sourceStatus.aniList === 'error' || (sourceStatus.aniList === 'ok' && !aniList.length)) preview() })
    .catch(() => { sourceStatus.jikan = 'error' })
  const scheduleTask = isCurrent
    ? withDeadline(async (requestSignal) => {
      const { getWeeklyTimetable } = await import('./animeScheduleApi.js')
      return getWeeklyTimetable(0, requestSignal)
    }, 8000, signal)
      .then((items) => { schedule = items; sourceStatus.schedule = 'ok' })
      .catch(() => { sourceStatus.schedule = 'unavailable' })
    : Promise.resolve()

  await Promise.all([aniListTask, jikanTask, scheduleTask])
  if (signal?.aborted) throw signal.reason || new Error('Atualização cancelada.')
  if (!aniList.length && !jikan.length) {
    if (cached) {
      const fallback = { ...cached.data, page, updating: false, stale: true }
      onUpdate?.(fallback)
      return fallback
    }
    throw new Error('O catálogo da temporada está temporariamente indisponível. Tente novamente em instantes.')
  }

  const result = {
    data: combineSeasonSources({ aniList, jikan, schedule }, targetSeason),
    hasNext: false, page, sourceStatus, updating: false, stale: false,
  }
  writeSnapshot(cacheKey, result)
  onUpdate?.(result)
  return result
}
