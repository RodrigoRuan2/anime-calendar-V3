import { useState, useEffect } from 'react'
import { getSeasonAnime } from '../services/animeScheduleApi'

export function useSeasonAnime() {
  const [animes, setAnimes] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPage(1)
  }, [])

  async function fetchPage(pageNumber) {
    setLoading(true)
    setError(null)

    try {
      const res = await getSeasonAnime(pageNumber)

      setAnimes((prev) => {
        const map = new Map()
        const combined = [...prev, ...res.data]

        for (const anime of combined) {
          map.set(anime.mal_id, anime)
        }

        return Array.from(map.values())
      })

      setHasMore(res.hasNext)
      setPage(pageNumber)
    } catch (err) {
      setError(
        err.response?.status === 429
          ? 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.'
          : 'Erro ao carregar a temporada. Verifique sua conexão e tente novamente.'
      )
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function loadMore() {
    if (hasMore && !loading) {
      fetchPage(page + 1)
    }
  }

  return { animes, loading, loadMore, hasMore, page, fetchPage, error }
}
