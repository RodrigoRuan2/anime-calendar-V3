import { useState, useEffect } from 'react'
import { getWeeklyTimetable } from '../services/animeScheduleApi'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function groupByDay(animeArray, weekOffset = 0) {
  const grouped = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  }

  animeArray.forEach((anime) => {
    if (!anime.episodeDate) return

    const date = new Date(anime.episodeDate)

    if (weekOffset > 0) {
      date.setDate(date.getDate() + weekOffset * 7)
    }

    const day = DAYS[date.getDay()]

    if (grouped[day] !== undefined) {
      grouped[day].push(anime)
    }
  })

  Object.keys(grouped).forEach((day) => {
    grouped[day].sort((a, b) => new Date(a.episodeDate) - new Date(b.episodeDate))
  })

  return grouped
}

export function useAnimeSchedule(weekOffset = 0) {
  const [schedule, setSchedule] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSchedule() {
      try {
        setLoading(true)
        setError(null)
        const data = await getWeeklyTimetable()
        const grouped = groupByDay(data, weekOffset)
        setSchedule(grouped)
      } catch (err) {
        setError('Erro ao buscar o cronograma. Verifique sua API key.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [weekOffset])

  return { schedule, loading, error }
}