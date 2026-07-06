import '../styles/SeasonCard.css'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK   = 'https://placehold.co/200x280?text=?'

export default function SeasonCard({ anime, status, onToggle, onClick }) {
  const imageUrl = anime.imageVersionRoute
    ? `${IMAGE_BASE}${anime.imageVersionRoute}`
    : null

  return (
    <div
      className={`season-card ${status.watching ? 'season-card--watching' : ''}`}
      onClick={onClick ? () => onClick(anime) : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >

      {/* Poster */}
      <div className="season-card__poster">
        <img
          src={anime.images?.jpg?.image_url}
          alt={anime.title}
          loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK }}
        />

        {/* Overlay com botão ao passar o mouse */}
        <div className="season-card__overlay">
          <button
            className={`season-card__btn ${status.watching ? 'active-watching' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(anime, 'watching') }}
            title={status.watching ? 'Parar de assistir' : 'Marcar como assistindo'}
          >
            {status.watching ? '▶ Assistindo' : '▶ Assistir'}
          </button>
        </div>

        {/* Badge de status visível no card */}
        <div className="season-card__badges">
          {status.watching && <span className="badge badge--watching">▶</span>}
        </div>
      </div>

      {/* Título */}
      <div className="season-card__info">
        <p className="season-card__title">{anime.title}</p>
      </div>
    </div>
  )
}
