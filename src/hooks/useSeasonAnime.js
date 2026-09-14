import { useEffect, useState } from 'react'
import { getSeasonAnime } from '../services/seasonCatalogApi'

export function useSeasonAnime(targetSeason) {
  const [state, setState] = useState({ animes: [], loading: true, error: null, sourceStatus: null })
  const { year, season } = targetSeason

  useEffect(() => {
    let cancelled = false
    getSeasonAnime({ year, season })
      .then((result) => { if (!cancelled) setState({ animes: result.data, loading: false, error: null, sourceStatus: result.sourceStatus }) })
      .catch((error) => { if (!cancelled) setState({ animes: [], loading: false, error: error.message || 'Erro ao carregar a temporada.', sourceStatus: null }) })
    return () => { cancelled = true }
  }, [year, season])

  return state
}
