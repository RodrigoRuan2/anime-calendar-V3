import { useSeasonAnime } from '../hooks/useSeasonAnime'
import { useState } from 'react'
import { getSeasonForDate, getSeasonLabel, shiftSeason } from '../utils/season'
import SeasonCard from './SeasonCard'
import '../styles/SeasonGrid.css'

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'new', label: 'Novos' },
  { key: 'continuing', label: 'Continuações' },
  { key: 'watching', label: '▶ Assistindo' },
]

export default function SeasonGrid({
  activeFilter,
  onFilterChange,
  onToggle,
  onFavorite,
  getStatus,
  onAnimeClick,
}) {
  const [targetSeason, setTargetSeason] = useState(() => getSeasonForDate())
  const { animes, loading, error } = useSeasonAnime(targetSeason)

  const filtered = animes.filter((anime) => {
    const status = getStatus(anime)
    if (activeFilter === 'watching') return status.watching
    if (activeFilter === 'continuing') return anime.releaseType === 'continuing' || anime.releaseType === 'sequel'
    if (activeFilter === 'new') return anime.releaseType === 'new' || anime.releaseType === 'sequel'
    return true
  })

  return (
    <div className="season-grid-wrapper">
      <div className="season-header">
        <div className="season-title">
          <h2>{getSeasonLabel(targetSeason)}</h2>
          <span>Catálogo da temporada</span>
        </div>
        <div className="season-navigation">
          <button className="season-toggle-btn" onClick={() => setTargetSeason((current) => shiftSeason(current, -1))} aria-label="Temporada anterior">← Anterior</button>
          <button className="season-toggle-btn" onClick={() => setTargetSeason((current) => shiftSeason(current, 1))} aria-label="Próxima temporada">Próxima →</button>
        </div>
      </div>

      <div className="season-filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            className={'season-filter-btn ' + (activeFilter === filter.key ? 'active' : '')}
            onClick={() => onFilterChange(filter.key)}
          >
            {filter.label}
          </button>
        ))}
        <span className="season-count">{filtered.length} animes</span>
      </div>

      {loading ? (
        <div className="calendar-status"><div className="loader" /><p>Carregando catálogo da temporada...</p></div>
      ) : error ? (
        <div className="calendar-status calendar-status--error">
          <p>⚠️ {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="season-empty">Nenhum anime encontrado.</p>
      ) : (
        <div className="season-grid">
          {filtered.map((anime) => (
            <SeasonCard
              key={anime.id}
              anime={anime}
              targetSeason={targetSeason}
              status={getStatus(anime)}
              onToggle={onToggle}
              onFavorite={onFavorite}
              onClick={onAnimeClick}
            />
          ))}
        </div>
      )}

    </div>
  )
}
