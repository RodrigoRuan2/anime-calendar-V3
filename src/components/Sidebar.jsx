import '../styles/Sidebar.css'
import { getAnimeKey } from '../utils/animeKey'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK = 'https://placehold.co/36x50?text=?'

export default function Sidebar({ allAnimes, statusMap, onToggle, isOpen, onClose }) {
  const watching = allAnimes.filter((anime) => statusMap[getAnimeKey(anime)]?.watching)
  const favorites = allAnimes.filter((anime) => statusMap[getAnimeKey(anime)]?.favorite)

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
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
      <div className="sidebar__section">
        <h2 className="sidebar__title">
          <span className="sidebar__icon sidebar__icon--watching">▶</span>
          Assistindo
          <span className="sidebar__badge">{watching.length}</span>
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

      <div className="sidebar__divider" />

      <div className="sidebar__section">
        <h2 className="sidebar__title">
          <span className="sidebar__icon sidebar__icon--favorite">★</span>
          Favoritos
          <span className="sidebar__badge">{favorites.length}</span>
        </h2>

        {favorites.length === 0 ? (
          <p className="sidebar__empty">Nenhum favorito ainda</p>
        ) : (
          <ul className="sidebar__list">
            {favorites.map((anime) => (
              <SidebarItem
                key={getAnimeKey(anime)}
                anime={anime}
                field="favorite"
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

// Item individual
function SidebarItem({ anime, field, onToggle }) {
  return (
    <li className="sidebar__item">
      <img
        className="sidebar__item-img"
        src={
          anime.images?.jpg?.image_url ||
          (anime.imageVersionRoute ? `${IMAGE_BASE}${anime.imageVersionRoute}` : FALLBACK)
        }
        alt={anime.title}
        onError={(e) => {
          e.target.onerror = null
          e.target.src = FALLBACK
        }}
      />

      <span className="sidebar__item-title">{anime.title}</span>

      <button
        className="sidebar__item-remove"
        onClick={() => onToggle(anime, field)}
        title="Remover"
      >
        ✕
      </button>
    </li>
  )
}