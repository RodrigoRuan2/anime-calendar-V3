import '../styles/AnimeCard.css'

const PLATFORM_COLORS = {
  crunchyroll: '#F47521',
  netflix:     '#E50914',
  amazon:      '#00A8E0',
  hidive:      '#00AEEF',
  hulu:        '#1CE783',
  youtube:     '#FF0000',
  disney:      '#113CCF',
  apple:       '#555555',
  bilibili:    '#00A1D6',
}

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK   = 'https://placehold.co/100x140?text=?'

export default function AnimeCard({ anime, status, onToggle }) {
  const airTime = anime.episodeDate
    ? new Date(anime.episodeDate).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--'

  const platforms = anime.streams || []
  const imageUrl  = anime.imageVersionRoute
    ? `${IMAGE_BASE}${anime.imageVersionRoute}`
    : null

  const isWatching = status?.watching
  const isFavorite = status?.favorite

  return (
    <div className={`anime-card ${isWatching ? 'anime-card--watching' : ''} ${isFavorite ? 'anime-card--favorite' : ''}`}>

      {/* Poster */}
      <div className="anime-card__poster">
        <img
          src={imageUrl || FALLBACK}
          alt={anime.title}
          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK }}
        />
      </div>

      {/* Info */}
      <div className="anime-card__info">
        <h3 className="anime-card__title">{anime.title}</h3>

        <div className="anime-card__meta">
          <span className="anime-card__time">⏱ {airTime}</span>
          {anime.episodeNumber && (
            <span className="anime-card__episode">EP {anime.episodeNumber}</span>
          )}
        </div>

        {platforms.length > 0 && (
          <div className="anime-card__platforms">
            {platforms.map((stream, index) => {
              const color = PLATFORM_COLORS[stream.platform] || '#888'
              return (
                <a
                  key={index}
                  href={`https://${stream.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="anime-card__platform-badge"
                  style={{ backgroundColor: color }}
                  title={stream.name}
                >
                  {stream.name}
                </a>
              )
            })}
          </div>
        )}

        {/* Botões de status */}
        {onToggle && (
          <div className="anime-card__actions">
            <button
              className={`anime-card__action-btn ${isWatching ? 'active-watching' : ''}`}
              onClick={() => onToggle(anime, 'watching')}
              title={isWatching ? 'Parar de assistir' : 'Marcar como assistindo'}
            >
              {isWatching ? '▶ Assistindo' : '▶ Assistir'}
            </button>
            <button
              className={`anime-card__action-btn ${isFavorite ? 'active-favorite' : ''}`}
              onClick={() => onToggle(anime, 'favorite')}
              title={isFavorite ? 'Remover favorito' : 'Favoritar'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
