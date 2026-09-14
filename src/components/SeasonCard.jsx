import { getReleaseLabel } from '../utils/season'
import '../styles/SeasonCard.css'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK = 'https://placehold.co/300x420?text=?'
const TYPE_LABEL = { new: 'Novo', sequel: 'Sequência', continuing: 'Continuação' }

export default function SeasonCard({ anime, targetSeason, status, onToggle, onClick }) {
  const imageUrl = anime.coverImage || (anime.imageVersionRoute ? `${IMAGE_BASE}${anime.imageVersionRoute}` : null) || anime.images?.jpg?.image_url
  const description = anime.description || 'Sinopse ainda não informada.'

  return (
    <article className={`season-card season-card--horizontal ${status.watching ? 'season-card--watching' : ''}`} onClick={onClick ? () => onClick(anime) : undefined}>
      <div className="season-card__poster">
        <img src={imageUrl || FALLBACK} alt={anime.title} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK }} />
        <div className="season-card__overlay">
          <button className={`season-card__btn ${status.watching ? 'active-watching' : ''}`} onClick={(event) => { event.stopPropagation(); onToggle(anime, 'watching') }}>
            {status.watching ? '▶ Assistindo' : '▶ Assistir'}
          </button>
        </div>
        <div className="season-card__badges">
          {anime.releaseType && <span className="badge badge--type">{TYPE_LABEL[anime.releaseType]}</span>}
        </div>
      </div>

      <div className="season-card__info">
        <div className="season-card__heading">
          <div>
            <p className="season-card__eyebrow">{getReleaseLabel(anime, targetSeason)}</p>
            <h3 className="season-card__title">{anime.title}</h3>
            {anime.titleEnglish && anime.titleEnglish !== anime.title && <p className="season-card__title-alt">{anime.titleEnglish}</p>}
          </div>
          {status.watching && <span className="season-card__watching">▶ Assistindo</span>}
        </div>

        <p className="season-card__description">{description}</p>

        <div className="season-card__footer">
          <div className="season-card__tags">
            {anime.format && <span>{anime.format.replace('_', ' ')}</span>}
            {anime.episodes && <span>{anime.episodes} eps</span>}
            {anime.genres?.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}
          </div>
          <button className="season-card__details" onClick={(event) => { event.stopPropagation(); onClick?.(anime) }}>Ver detalhes →</button>
        </div>
      </div>
    </article>
  )
}
