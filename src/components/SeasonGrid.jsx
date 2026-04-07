import { useSeasonAnime } from '../hooks/useSeasonAnime'
import { useEffect, useRef } from 'react'
import SeasonCard from './SeasonCard'
import '../styles/SeasonGrid.css'

const FILTERS = [
  { key: 'all',      label: 'Todos'        },
  { key: 'watching', label: '▶ Assistindo' },
  { key: 'favorite', label: '★ Favoritos'  },
]

export default function SeasonGrid({
  activeFilter,
  onFilterChange,
  onToggle,
  getStatus
}) {
  const { animes, loading, loadMore, hasMore, error } = useSeasonAnime()

  const loadMoreRef = useRef(null)

  // 🔥 AUTO LOAD (scroll infinito)
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
    if (activeFilter === 'favorite') return status.favorite
    return true
  })

  return (
    <div className="season-grid-wrapper">
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
            />
          ))}
        </div>
      )}

      {/* 🔘 BOTÃO (fallback) */}
      {hasMore && (
        <button className="season-load-more" onClick={loadMore}>
          Carregar mais
        </button>
      )}

      {/* 🔥 TRIGGER DO SCROLL AUTOMÁTICO */}
      <div ref={loadMoreRef} style={{ height: '20px' }} />
    </div>
  )
}