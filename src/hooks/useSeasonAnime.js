import { useState, useEffect, useCallback } from 'react'
import { getSeasonAnime } from '../services/animeScheduleApi'
import { getAnimeKey } from '../utils/animeKey'

export function useSeasonAnime(seasonOffset = 0) {
  const [animes, setAnimes] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPage = useCallback(async (pageNumber) => {
    setLoading(true)
    setError(null)

    try {
      const res = await getSeasonAnime(pageNumber, seasonOffset)
      setAnimes((prev) => {
        const map = new Map()
        for (const anime of [...prev, ...res.data]) {
          map.set(getAnimeKey(anime), anime)
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
  }, [seasonOffset])

  useEffect(() => {
    setAnimes([])
    setPage(1)
    setHasMore(true)
    setError(null)
    fetchPage(1)
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchPage(page + 1)
    }
  }, [fetchPage, hasMore, loading, page])

  return { animes, loading, loadMore, hasMore, page, fetchPage, error }
}
