import { useEffect, useState } from 'react'
import { getSeasonAnime } from '../services/seasonCatalogApi'

export function useSeasonAnime(targetSeason) {
  const [state, setState] = useState({ key: null, animes: [], loading: true, error: null, sourceStatus: null, updating: false, stale: false })
  const { year, season } = targetSeason
  const key = `${year}:${season}`

  useEffect(() => {
    const controller = new AbortController()
    const update = (result) => {
      if (!controller.signal.aborted) setState({ key, animes: result.data, loading: false, error: null, sourceStatus: result.sourceStatus, updating: result.updating, stale: result.stale })
    }
    getSeasonAnime({ year, season, onUpdate: update, signal: controller.signal })
      .then(update)
      .catch((error) => {
        if (!controller.signal.aborted) setState((previous) => ({ ...previous, loading: false, updating: false, stale: Boolean(previous.animes.length), error: previous.animes.length ? null : error.message || 'Erro ao carregar a temporada.' }))
      })
    return () => controller.abort()
  }, [year, season, key])

  return state.key === key ? state : { key, animes: [], loading: true, error: null, sourceStatus: null, updating: true, stale: false }
}
