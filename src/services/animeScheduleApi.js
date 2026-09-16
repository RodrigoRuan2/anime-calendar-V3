import axios from 'axios'
import { getAniListMoviesByYear } from './aniListApi.js'
import { detectScheduleChanges, getWeekRange, mergeScheduleSources, SCHEDULE_TIMEZONE } from '../utils/weeklySchedule.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL
const CACHE_TTL_MS = 5 * 60 * 1000
const WEEKLY_CACHE_TTL_MS = 10 * 60 * 1000
const ANILIST_URL = 'https://graphql.anilist.co'

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return data
  } catch {
    return null
  }
}

function cacheSet(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // Storage can be unavailable.
  }
}

function getMondayDate(weekOffset = 0) {
  const date = new Date()
  const day = date.getDay()
  const daysSinceMonday = (day + 6) % 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysSinceMonday + weekOffset * 7)
  return date.toISOString().slice(0, 10)
}

function normalizeTsuzukiEpisode(episode) {
  return {
    title: episode.title,
    route: `anilist-${episode.mediaId}`,
    anilistId: episode.mediaId,
    episodeDate: episode.airingAtIso,
    episodeNumber: episode.episode,
    airingStatus: 'unaired',
    status: 'Ongoing',
    // Tsuzuki usa o thumbnail pequeno da AniList. A versão medium mantém o
    // mesmo pôster, mas evita cards borrados quando esta for a única fonte.
    coverImage: episode.coverImage?.replace('/cover/small/', '/cover/medium/') || null,
    // A Tsuzuki informa a plataforma, mas não disponibiliza uma URL oficial
    // do streaming. Não criamos links inexistentes no card.
    streams: [],
    platformName: episode.platform,
    scheduleSource: 'tsuzuki',
    source: 'tsuzuki',
    airingAt: episode.airingAtIso,
    platform: episode.platform || null,
    timeEstimated: episode.estimated,
  }
}

function normalizeAnimeScheduleEpisode(anime) {
  const routeAniListId = String(anime.route || '').match(/^anilist-(\d+)$/)?.[1]
  return {
    id: anime.route || anime.anilistId || anime.mal_id,
    anilistId: anime.anilistId || anime.anilist_id || routeAniListId || null,
    malId: anime.malId || anime.mal_id || anime.mal_id || null,
    title: anime.title,
    titleEnglish: anime.english || null,
    titleRomaji: anime.romaji || anime.title,
    coverImage: anime.coverImage || (anime.imageVersionRoute ? `https://img.animeschedule.net/production/assets/public/img/${anime.imageVersionRoute}` : null),
    episodeNumber: anime.episodeNumber || null,
    airingAt: anime.episodeDate || null,
    episodeDate: anime.episodeDate || null,
    platform: anime.platformName || null,
    streams: anime.streams || [],
    status: anime.status || null,
    source: 'animeschedule',
    timeEstimated: Boolean(anime.timeEstimated),
  }
}

const ANILIST_AIRING_QUERY = `query ($page: Int!, $start: Int!, $end: Int!) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
      airingAt episode
      media { id idMal title { romaji english native } coverImage { large medium } status format }
    }
  }
}`

async function getAniListAiringSchedule(range) {
  const items = []
  for (let page = 1; page <= 5; page += 1) {
    const response = await axios.post(ANILIST_URL, { query: ANILIST_AIRING_QUERY, variables: { page, start: Math.floor(range.start.getTime() / 1000), end: Math.floor(range.end.getTime() / 1000) } })
    if (response.data?.errors?.length) throw new Error(response.data.errors[0].message)
    const result = response.data?.data?.Page
    items.push(...(result?.airingSchedules || []).map((schedule) => ({
      id: `anilist:${schedule.media.id}`,
      anilistId: schedule.media.id,
      malId: schedule.media.idMal || null,
      title: schedule.media.title.romaji || schedule.media.title.english || schedule.media.title.native,
      titleEnglish: schedule.media.title.english || null,
      titleRomaji: schedule.media.title.romaji || null,
      coverImage: schedule.media.coverImage?.large || schedule.media.coverImage?.medium || null,
      episodeNumber: schedule.episode || null,
      airingAt: new Date(schedule.airingAt * 1000).toISOString(),
      episodeDate: new Date(schedule.airingAt * 1000).toISOString(),
      status: schedule.media.status,
      streams: [],
      platform: null,
      source: 'anilist',
      timeEstimated: false,
    })))
    if (!result?.pageInfo?.hasNextPage) break
  }
  return items
}

async function getAnimeScheduleForCurrentWeek(weekOffset) {
  if (weekOffset !== 0 || !SUPABASE_URL) throw new Error('AnimeSchedule indisponível para esta semana.')
  const params = new URLSearchParams({ tz: SCHEDULE_TIMEZONE })
  const response = await axios.get(SUPABASE_URL + '?' + params.toString())
  return (response.data || []).map(normalizeAnimeScheduleEpisode)
}

async function getTsuzukiSchedule(start, days, format) {
  const params = new URLSearchParams({ start, days: String(days), airType: 'sub' })
  if (format) params.set('format', format)

  const response = await axios.get(`https://tsuzuki.top/api/v1/schedule?${params.toString()}`)
  if (!response.data?.ok || !Array.isArray(response.data.episodes)) {
    throw new Error('A agenda de lançamentos não retornou dados válidos.')
  }

  return response.data.episodes.map(normalizeTsuzukiEpisode)
}

export async function getWeeklyTimetable(weekOffset = 0) {
  const cacheKey = `anicaltimetable_v2_${weekOffset}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  // A AnimeSchedule é excelente para a semana atual, inclusive pelos links
  // oficiais. Para a próxima semana usamos uma API baseada em datas reais:
  // antes, o app apenas somava 7 dias aos episódios desta semana.
  if (weekOffset > 0) {
    const data = await getTsuzukiSchedule(getMondayDate(weekOffset), 7)
    cacheSet(cacheKey, data)
    return data
  }

  if (!SUPABASE_URL) {
    throw new Error('A URL da função Supabase não foi configurada.')
  }

  const params = new URLSearchParams({ tz: 'America/Sao_Paulo' })
  const response = await axios.get(SUPABASE_URL + '?' + params.toString())
  cacheSet(cacheKey, response.data)
  return response.data
}

export async function getAggregatedWeeklySchedule({ weekOffset = 0, timezone = SCHEDULE_TIMEZONE, forceRefresh = false } = {}) {
  const range = getWeekRange(weekOffset, timezone)
  const cacheKey = `anical:weekly:v6:${range.startDate}:${timezone}`
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null')
      if (cached && Date.now() - cached.timestamp < WEEKLY_CACHE_TTL_MS) return cached.data
    } catch { /* no cache */ }
  }

  const [animeSchedule, tsuzuki, aniList] = await Promise.allSettled([
    getAnimeScheduleForCurrentWeek(weekOffset),
    getTsuzukiSchedule(range.startDate, 7),
    getAniListAiringSchedule(range),
  ])
  const lists = [animeSchedule, tsuzuki, aniList].map((result) => result.status === 'fulfilled' ? result.value : [])
  if (!lists.some((list) => list.length)) throw new Error('Não foi possível atualizar o calendário.')

  const data = {
    items: detectScheduleChanges(mergeScheduleSources(lists, timezone)),
    range,
    partial: [animeSchedule, tsuzuki, aniList].some((result) => result.status === 'rejected'),
    sourceStatus: { animeschedule: animeSchedule.status === 'fulfilled', tsuzuki: tsuzuki.status === 'fulfilled', anilist: aniList.status === 'fulfilled' },
    updatedAt: new Date().toISOString(),
  }
  try { sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data })) } catch { /* no cache */ }
  return data
}

export async function getMonthlyMovies(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const start = firstDay.toISOString().slice(0, 10)
  const cacheKey = `anicalmovies_v1_${start}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const data = await getTsuzukiSchedule(start, lastDay.getDate(), 'MOVIE')
  cacheSet(cacheKey, data)
  return data
}

export async function getYearlyMovies(year) {
  const [scheduledMonths, announcedMovies] = await Promise.all([
    Promise.all(Array.from({ length: 12 }, (_, month) => getMonthlyMovies(new Date(year, month, 1)))),
    getAniListMoviesByYear(year),
  ])

  const months = scheduledMonths.map((movies) => [...movies])
  const scheduledIds = new Set(months.flat().map((movie) => movie.anilistId))

  announcedMovies.forEach((movie) => {
    const month = movie.startDate?.month
    if (!month || scheduledIds.has(movie.id)) return

    months[month - 1].push({
      title: movie.title.romaji || movie.title.english || movie.title.native,
      romaji: movie.title.romaji,
      english: movie.title.english,
      anilistId: movie.id,
      route: `anilist-${movie.id}`,
      episodeDate: new Date(Date.UTC(year, month - 1, movie.startDate.day || 1, 12)).toISOString(),
      coverImage: movie.coverImage?.large || movie.coverImage?.medium,
      status: movie.status,
      releaseDateOnly: true,
      timeEstimated: false,
      streams: [],
    })
  })

  return months.map((movies, month) => ({
    month,
    movies: movies.sort((a, b) => new Date(a.episodeDate) - new Date(b.episodeDate)),
  }))
}
