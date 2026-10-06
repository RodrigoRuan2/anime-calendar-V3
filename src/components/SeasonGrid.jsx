import { useSeasonAnime } from '../hooks/useSeasonAnime'
import { useState } from 'react'
import { getSeasonForDate, getSeasonLabel, shiftSeason } from '../utils/season'
import { groupSeasonAgenda } from '../utils/seasonAgenda'
import { genreLabel, genreOptions, matchesGenreAndScore, SCORE_OPTIONS } from '../utils/animeFilters'
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
  const [genre, setGenre] = useState('all')
  const [score, setScore] = useState('all')
  const { animes, loading, error, updating, stale } = useSeasonAnime(targetSeason)
  const genres = genreOptions(animes)

  const filtered = animes.filter((anime) => {
    if (!matchesGenreAndScore(anime, genre, score)) return false
    const status = getStatus(anime)
    if (activeFilter === 'watching') return status.watching
    if (activeFilter === 'continuing') return anime.releaseType === 'continuing' || anime.releaseType === 'sequel'
    if (activeFilter === 'new') return anime.releaseType === 'new' || anime.releaseType === 'sequel'
    return true
  })
  const agendaGroups = groupSeasonAgenda(filtered, targetSeason)
  const changeSeason = (direction) => {
    setTargetSeason((current) => shiftSeason(current, direction))
    setGenre('all')
    setScore('all')
  }

  return (
    <div className="season-grid-wrapper">
      <div className="season-header">
        <div className="season-title">
          <h2>{getSeasonLabel(targetSeason)}</h2>
          <span>Estreias e continuações em ordem de chegada</span>
        </div>
        <div className="season-navigation">
          <button className="season-toggle-btn" onClick={() => changeSeason(-1)} aria-label="Temporada anterior">← Anterior</button>
          <button className="season-toggle-btn" onClick={() => changeSeason(1)} aria-label="Próxima temporada">Próxima →</button>
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
        {!loading && updating && <span className="season-sync">Atualizando fontes…</span>}
        {!loading && stale && !updating && <span className="season-sync">Exibindo última versão salva</span>}
      </div>

      <div className="season-refine" aria-label="Filtrar temporada por gênero e nota">
        <label>Gênero<select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">Todos os gêneros</option>{genres.map((value) => <option key={value} value={value}>{genreLabel(value)}</option>)}</select></label>
        <label>Nota<select value={score} onChange={(event) => setScore(event.target.value)}>{SCORE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>

      {loading ? (
        <div className="calendar-status"><div className="loader" /><p>Carregando catálogo da temporada...</p></div>
      ) : error ? (
        <div className="calendar-status calendar-status--error">
          <p>⚠️ {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="season-empty">Nenhum anime corresponde aos filtros selecionados.</p>
      ) : (
        <div className="season-agenda">
          {agendaGroups.map((group) => (
            <section className="season-agenda__group" key={group.key} aria-label={group.title}>
              <div className="season-agenda__heading"><h3>{group.title}</h3><span>{group.subtitle}</span></div>
              <div className="season-agenda__list">
                {group.animes.map((anime) => (
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
            </section>
          ))}
        </div>
      )}

    </div>
  )
}
