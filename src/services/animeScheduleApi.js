import axios from 'axios'

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_FUNCTION_URL
const DIRECT_API_KEY = import.meta.env.VITE_ANIMESCHEDULE_API_KEY
const CACHE_TTL_MS   = 5 * 60 * 1000 // 5 minutos

const jikanApi = axios.create({
  baseURL: 'https://api.jikan.moe/v4',
})

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) { sessionStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function cacheSet(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export async function getWeeklyTimetable() {
  const cacheKey = 'anicaltimetable'
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  let data
  if (SUPABASE_URL) {
    const params = new URLSearchParams({ path: '/api/v3/timetables/sub', timezone: 'America/Sao_Paulo' })
    const response = await axios.get(`${SUPABASE_URL}?${params.toString()}`)
    data = response.data
  } else {
    const response = await axios.get('/api-proxy/api/v3/timetables/sub', {
      params: { timezone: 'America/Sao_Paulo' },
      headers: { Authorization: `Bearer ${DIRECT_API_KEY}` },
    })
    data = response.data
  }

  cacheSet(cacheKey, data)
  return data
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getSeasonAnime(page = 1, seasonOffset = 0, retries = 3) {
  const currentDate = new Date()
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  let targetMonth = month + seasonOffset * 3
  let targetYear = year

  while (targetMonth > 12) {
    targetMonth -= 12
    targetYear += 1
  }

  let season = ''
  if (targetMonth <= 3) season = 'winter'
  else if (targetMonth <= 6) season = 'spring'
  else if (targetMonth <= 9) season = 'summer'
  else season = 'fall'

  try {
    const cacheKey = `anicalseason_${targetYear}_${season}_p${page}`
    const cached = cacheGet(cacheKey)
    if (cached) return cached

    const response = await jikanApi.get(`/seasons/${targetYear}/${season}`, {
      params: { page },
    })

    const list = response.data?.data || []

    const unique = []
    const ids = new Set()

    for (const anime of list) {
      if (!ids.has(anime.mal_id)) {
        ids.add(anime.mal_id)
        unique.push(anime)
      }
    }

    const filtered = unique.filter(
      (anime) =>
        (seasonOffset === 0 ? anime.status === 'Currently Airing' : anime.status === 'Not yet aired') &&
        anime.type !== 'Music'
    )

    const result = {
      data: filtered,
      hasNext: response.data?.pagination?.has_next_page,
    }
    cacheSet(cacheKey, result)
    return result
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      const waitTime = 1000 * (4 - retries)
      await delay(waitTime)
      return getSeasonAnime(page, seasonOffset, retries - 1)
    }

    throw error
  }
}