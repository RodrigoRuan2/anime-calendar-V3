import { useEffect, useState } from 'react'
import { getAniListDetails } from '../services/aniListApi'
import '../styles/AnimeModal.css'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK = 'https://placehold.co/110x155?text=?'

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

export default function AnimeModal({ anime, status, onToggle, onClose }) {
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Busca sinopse e metadados na AniList para itens do calendário e temporada.
  useEffect(() => {
    const controller = new AbortController()
    const searchTitle = anime.romaji || anime.english || anime.title

    setLoadingDetails(true)
    getAniListDetails(searchTitle, controller.signal)
      .then((data) => setDetails(data))
      .catch((error) => {
        if (error.name !== 'AbortError') setDetails(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetails(false)
      })

    return () => controller.abort()
  }, [anime.english, anime.romaji, anime.title])

  const posterUrl =
    details?.coverImage?.large ||
    details?.coverImage?.medium ||
    anime.images?.jpg?.large_image_url ||
    (anime.imageVersionRoute ? `${IMAGE_BASE}${anime.imageVersionRoute}` : null) ||
    FALLBACK

  const title      = details?.title?.romaji || details?.title?.english || anime.title || '—'
  const titleJp    = details?.title?.native || ''
  const synopsis   = details?.description || 'Sem sinopse disponível.'
  const score      = details?.averageScore
  const episodes   = details?.episodes
  const status_str = details?.status || anime.status || ''
  const type       = details?.format || ''
  const studios    = details?.studios?.nodes?.map((s) => s.name).join(', ') || ''
  const genres     = details?.genres || []
  const streams    = anime.streams || []
  const isWatching = status?.watching
  const isAiring   = status_str === 'RELEASING' || status_str === 'Currently Airing'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Hero */}
        <div className="modal__hero">
          <img className="modal__hero-bg" src={posterUrl} alt="" aria-hidden />
          <img
            className="modal__hero-poster"
            src={posterUrl}
            alt={title}
            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK }}
          />
          <button className="modal__close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {/* Body */}
        <div className="modal__body">
          {loadingDetails ? (
            <div className="modal__loading">
              <div className="loader" />
              <span>Buscando detalhes...</span>
            </div>
          ) : (
            <>
              <h2 className="modal__title">{title}</h2>
              {titleJp && <p className="modal__title-jp">{titleJp}</p>}

              <div className="modal__stats">
                {score && (
                  <span className="modal__stat modal__stat--score">⭐ {score}</span>
                )}
                {isAiring && (
                  <span className="modal__stat modal__stat--airing">● Em exibição</span>
                )}
                {type && <span className="modal__stat">{type}</span>}
                {episodes && <span className="modal__stat">{episodes} eps</span>}
                {studios && <span className="modal__stat">🏢 {studios}</span>}
              </div>

              {genres.length > 0 && (
                <div className="modal__genres">
                  {genres.map((genre) => (
                    <span key={genre} className="modal__genre">{genre}</span>
                  ))}
                </div>
              )}

              {synopsis && (
                <>
                  <p className="modal__synopsis-label">Sinopse</p>
                  <p className="modal__synopsis">{synopsis}</p>
                </>
              )}

              {streams.length > 0 && (
                <>
                  <div className="modal__divider" />
                  <div className="modal__streams">
                    {streams.map((stream) => (
                      <a
                        key={`${stream.platform ?? stream.name}_${stream.url}`}
                        href={`https://${stream.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal__stream-link"
                        style={{ backgroundColor: PLATFORM_COLORS[stream.platform] || '#555' }}
                      >
                        {stream.name}
                      </a>
                    ))}
                  </div>
                </>
              )}

              <div className="modal__divider" />

              <div className="modal__actions">
                <button
                  className={`modal__action-btn ${isWatching ? 'active-watching' : ''}`}
                  onClick={() => onToggle(anime, 'watching')}
                >
                  {isWatching ? '▶ Assistindo' : '▶ Assistir'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
