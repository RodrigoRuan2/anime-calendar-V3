import axios from 'axios'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL

// 🟣 API 2 → Jikan (temporada) — sem chave, fica igual
const jikanApi = axios.create({
  baseURL: 'https://api.jikan.moe/v4',
})

// 📅 Cronograma semanal → agora passa pelo Supabase proxy
export async function getWeeklyTimetable() {
  const params = new URLSearchParams({
    path: '/api/v3/timetables/sub',
    timezone: 'America/Sao_Paulo',
  })

  const response = await axios.get(`${SUPABASE_URL}?${params.toString()}`)
  return response.data
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 🎌 Temporada atual com retry em caso de 429
export async function getSeasonAnime(page = 1, retries = 3) {
  const month = new Date().getMonth() + 1

  let season = ''
  if (month <= 3) season = 'winter'
  else if (month <= 6) season = 'spring'
  else if (month <= 9) season = 'summer'
  else season = 'fall'

  const year = new Date().getFullYear()

  try {
    const response = await jikanApi.get(`/seasons/${year}/${season}`, {
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
        anime.status === 'Currently Airing' &&
        anime.type !== 'Music'
    )

    return {
      data: filtered,
      hasNext: response.data?.pagination?.has_next_page,
    }
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      const waitTime = 1000 * (4 - retries)
      await delay(waitTime)
      return getSeasonAnime(page, retries - 1)
    }

    throw error
  }
}