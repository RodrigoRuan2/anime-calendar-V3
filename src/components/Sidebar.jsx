import '../styles/Sidebar.css'
import { getAnimeKey } from '../utils/animeKey'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK = 'https://placehold.co/36x50?text=?'

export default function Sidebar({ allAnimes, statusMap, onToggle, isOpen, onClose }) {
  const watching = allAnimes.filter((anime) => statusMap[getAnimeKey(anime)]?.watching)

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <span className="sidebar__header-title">⛩ Minha Lista</span>
        {onClose && (
          <button
            className="sidebar__close"
            type="button"
            onClick={onClose}
            aria-label="Fechar sidebar"
          >
            ✕
          </button>
        )}
      </div>

      <div className="sidebar__content">
        <div className="sidebar__section">
          <h2 className="sidebar__title">
            <span className="sidebar__icon sidebar__icon--watching">▶</span>
            Assistindo
            <span className="sidebar__count">{watching.length}</span>
          </h2>

          {watching.length === 0 ? (
            <p className="sidebar__empty">Nenhum anime marcado</p>
          ) : (
            <ul className="sidebar__list">
              {watching.map((anime) => (
                <SidebarItem
                  key={getAnimeKey(anime)}
                  anime={anime}
                  field="watching"
                  onToggle={onToggle}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ anime, field, onToggle }) {
  const imgSrc =
    anime.images?.jpg?.image_url ||
    (anime.imageVersionRoute ? `${IMAGE_BASE}${anime.imageVersionRoute}` : FALLBACK)

  return (
    <li className="sidebar__item">
      <img
        className="sidebar__item-img"
        src={imgSrc}
        alt={anime.title}
        loading="lazy"
        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK }}
      />
      <span className="sidebar__item-title">{anime.title}</span>
      <button
        className="sidebar__item-remove"
        onClick={() => onToggle(anime, field)}
        title="Remover"
        aria-label={`Remover ${anime.title}`}
      >
        ✕
      </button>
    </li>
  )
}
