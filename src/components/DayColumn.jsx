import AnimeCard from './AnimeCard'
import '../styles/DayColumn.css'

export default function DayColumn({
  day,
  dayKey,
  dateLabel,
  animes = [],
  onToggle,
  getStatus,
  isToday, // 👈 AGORA VEM DO CALENDAR
  className = ''
}) {

  return (
    <div className={`day-column ${isToday ? 'day-column--today' : ''} ${className}`}>
      
      {/* 🔥 HEADER MELHORADO */}
      <div className="day-column__header">
        <div className="day-column__top">
          <span className="day-column__date">{dateLabel}</span>
          <span className="day-column__count">
            {animes.length} {animes.length === 1 ? 'anime' : 'animes'}
          </span>
        </div>

        <div className="day-column__title">
          <span className="day-column__name">{day}</span>

          {isToday && (
            <span className="day-column__today-badge">
            </span>
          )}
        </div>
      </div>

      {/* 📺 LISTA */}
      <div className="day-column__list">
        {animes.length === 0 ? (
          <p className="day-column__empty">
            Nenhum anime hoje
          </p>
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