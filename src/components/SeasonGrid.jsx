import { useSeasonAnime } from '../hooks/useSeasonAnime'
import { useEffect, useRef, useState } from 'react'
import SeasonCard from './SeasonCard'
import '../styles/SeasonGrid.css'

const FILTERS = [
  { key: 'all',      label: 'Todos'        },
  { key: 'watching', label: '▶ Assistindo' },
]

export default function SeasonGrid({
  activeFilter,
  onFilterChange,
  onToggle,
  getStatus,
  onAnimeClick,
}) {
  const [isNextSeason, setIsNextSeason] = useState(false)
  const { animes, loading, loadMore, hasMore, error } = useSeasonAnime(isNextSeason ? 1 : 0)

  const loadMoreRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      {
        threshold: 1,
      }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [hasMore, loadMore])

  if (loading && animes.length === 0) {
    return (
      <div className="calendar-status">
        <div className="loader" />
        <p>Carregando temporada...</p>
      </div>
    )
  }

  const filtered = animes.filter((anime) => {
    const status = getStatus(anime)
    if (activeFilter === 'watching') return status.watching
    return true
  })

  return (
    <div className="season-grid-wrapper">
      <div className="season-header">
        <div className="season-title">
          <h2>
            {isNextSeason ? 'Próxima Temporada' : 'Temporada Atual'}
          </h2>
        </div>

        <button
          className="season-toggle-btn"
          onClick={() => setIsNextSeason(!isNextSeason)}
          aria-label={isNextSeason ? 'Voltar para temporada atual' : 'Ver próxima temporada'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 8L10 11L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isNextSeason ? 'Temporada Atual' : 'Próxima Temporada'}
        </button>
      </div>

      <div className="season-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`season-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
        <span className="season-count">{filtered.length} animes</span>
      </div>

      {error && animes.length > 0 && (
        <div className="calendar-status calendar-status--error">
          <p>⚠️ {error}</p>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="season-empty">Nenhum anime encontrado.</p>
      ) : (
        <div className="season-grid">
          {filtered.map((anime) => (
            <SeasonCard
              key={anime.mal_id || anime.route}
              anime={anime}
              status={getStatus(anime)}
              onToggle={onToggle}
              onClick={onAnimeClick}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <button className="season-load-more" onClick={loadMore}>
          Carregar mais
        </button>
      )}

      <div ref={loadMoreRef} style={{ height: '20px' }} />
    </div>
  )
}