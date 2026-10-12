import { useEffect, useState } from 'react'
import { getYearlyMovies } from '../services/animeScheduleApi'

export function useMonthlyMovies(year) {
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [partial, setPartial] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    getYearlyMovies(year)
      .then((data) => {
        if (!controller.signal.aborted) {
          setMonths(data.months)
          setPartial(data.partial)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(err)
          setError('Não foi possível buscar os filmes deste ano.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [year])

  return { months, loading, error, partial }
}
