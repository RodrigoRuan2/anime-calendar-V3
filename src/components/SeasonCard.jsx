import { getReleaseLabel } from '../utils/season'
import '../styles/SeasonCard.css'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK   = 'https://placehold.co/200x280?text=?'

const TYPE_LABEL = { new: 'Novo', sequel: 'Sequência', continuing: 'Continuação' }

export default function SeasonCard({ anime, targetSeason, status, onToggle, onClick }) {
  const imageUrl = anime.coverImage || (anime.imageVersionRoute
    ? `${IMAGE_BASE}${anime.imageVersionRoute}`
    : null) || anime.images?.jpg?.image_url

  return (
    <div
      className={`season-card ${status.watching ? 'season-card--watching' : ''}`}
      onClick={onClick ? () => onClick(anime) : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >

      {/* Poster */}
      <div className="season-card__poster">
        <img
          src={imageUrl || FALLBACK}
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
          {anime.releaseType && <span className="badge badge--type">{TYPE_LABEL[anime.releaseType]}</span>}
          {status.watching && <span className="badge badge--watching">▶</span>}
        </div>
      </div>

      {/* Título */}
      <div className="season-card__info">
        <p className="season-card__title">{anime.title}</p>
        <p className="season-card__release">{getReleaseLabel(anime, targetSeason)}</p>
      </div>
    </div>
  )
}
