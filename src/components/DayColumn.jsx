import AnimeCard from './AnimeCard'
import '../styles/DayColumn.css'

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

function getTodayKey() {
  return DAYS[new Date().getDay()]
}

export default function DayColumn({ day, dayKey, animes = [], onToggle, getStatus }) {
  const isToday = dayKey === getTodayKey()

  return (
    <div className={`day-column ${isToday ? 'day-column--today' : ''}`}>
      <div className="day-column__header">
        <span className="day-column__name">{day}</span>
        {isToday && <span className="day-column__today-badge">Hoje</span>}
        <span className="day-column__count">{animes.length} animes</span>
      </div>

      <div className="day-column__list">
        {animes.length === 0 ? (
          <p className="day-column__empty">Nenhum anime hoje</p>
        ) : (
          animes.map((anime, index) => (
            <AnimeCard
              key={anime.route || anime.mal_id || index}
              anime={anime}
              status={getStatus(anime)}
              onToggle={onToggle}
            />
          ))
        )}
      </div>
    </div>
  )
}
