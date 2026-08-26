import axios from 'axios'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL
const CACHE_TTL_MS = 5 * 60 * 1000
const JIKAN_MAX_RETRIES = 5

const jikanApi = axios.create({
  baseURL: 'https://api.jikan.moe/v4',
})

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

export async function getWeeklyTimetable() {
  const cacheKey = 'anicaltimetable'
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  if (!SUPABASE_URL) {
    throw new Error('A URL da função Supabase não foi configurada.')
  }

  const params = new URLSearchParams({ timezone: 'America/Sao_Paulo' })
  const response = await axios.get(SUPABASE_URL + '?' + params.toString())
  cacheSet(cacheKey, response.data)
  return response.data
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getCurrentSeasonFallback(page) {
  // O cronograma vem da nossa Edge Function e contém os animes em exibição.
  // Ele evita deixar a aba vazia quando a API pública Jikan fica indisponível.
  if (page > 1) return { data: [], hasNext: false }

  const cacheKey = 'anicalseason_schedule_v2_p1'
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const schedule = await getWeeklyTimetable()
  const seen = new Set()
  const data = schedule.filter((anime) => {
    const key = anime.route || anime.title
    const isOngoing = anime.status === 'Ongoing' || anime.airingStatus === 'airing'
    if (!key || !isOngoing || seen.has(key)) return false
    seen.add(key)
    return true
  })

  const result = { data, hasNext: false }
  cacheSet(cacheKey, result)
  return result
}

export async function getSeasonAnime(page = 1, seasonOffset = 0, retries = JIKAN_MAX_RETRIES) {
  // O AnimeSchedule é a fonte principal da temporada em exibição. Ao
  // contrário da Jikan, ela é a mesma API que alimenta o calendário e não
  // deixa a tela indisponível por erros 504 intermitentes.
  if (seasonOffset === 0) return getCurrentSeasonFallback(page)

  const endpoint = '/seasons/upcoming'

  try {
    const cacheKey = `anicalseason_v2_${seasonOffset === 0 ? 'now' : 'upcoming'}_p${page}`
    const cached = cacheGet(cacheKey)
    if (cached) return cached

    const response = await jikanApi.get(endpoint, {
      params: { page, limit: 24 },
    })

    const unique = []
    const ids = new Set()

    for (const anime of response.data?.data || []) {
      if (!ids.has(anime.mal_id)) {
        ids.add(anime.mal_id)
        unique.push(anime)
      }
    }

    const filtered = unique.filter((anime) => {
      return anime.status === 'Not yet aired' && anime.type !== 'Music'
    })

    const result = {
      data: filtered,
      hasNext: response.data?.pagination?.has_next_page,
    }
    cacheSet(cacheKey, result)
    return result
  } catch (error) {
    const status = error.response?.status
    if ((status === 429 || (status >= 500 && status < 600)) && retries > 0) {
      const retryAfter = Number(error.response.headers?.['retry-after'])
      const attempt = JIKAN_MAX_RETRIES - retries
      const waitTime = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : Math.min(16000, 1000 * 2 ** attempt)

      await delay(waitTime)
      return getSeasonAnime(page, seasonOffset, retries - 1)
    }

    throw error
  }
}
