import { useEffect, useState } from 'react'
import { getMonthlyMovies } from '../services/animeScheduleApi'

export function useMonthlyMovies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getMonthlyMovies()
      .then((data) => {
        if (!controller.signal.aborted) setMovies(data)
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(err)
          setError('Não foi possível buscar os filmes deste mês.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { movies, loading, error }
}
