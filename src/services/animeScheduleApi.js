import axios from 'axios'
import { getAniListMoviesByYear } from './aniListApi.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL
const CACHE_TTL_MS = 5 * 60 * 1000

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
    coverImage: episode.coverImage,
    // A Tsuzuki informa a plataforma, mas não disponibiliza uma URL oficial
    // do streaming. Não criamos links inexistentes no card.
    streams: [],
    platformName: episode.platform,
    scheduleSource: 'tsuzuki',
    timeEstimated: episode.estimated,
  }
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
