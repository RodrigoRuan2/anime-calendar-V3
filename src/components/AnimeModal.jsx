import { useEffect, useState } from 'react'
import { getAniListDetails } from '../services/aniListApi'
import { cleanSynopsis, translateSynopsis } from '../services/translationApi'
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

export default function AnimeModal({ anime, status, onToggle, onFavorite, onToggleEpisode, onClose }) {
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [episodeInput, setEpisodeInput] = useState(() => String(Number(anime.episodeNumber) || Math.max(0, ...(status?.watchedEpisodes || [])) + 1))

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

    getAniListDetails(searchTitle, controller.signal)
      .then(async (data) => {
        if (!data?.description) return data

        try {
          const translatedDescription = await translateSynopsis(data.description, controller.signal)
          return { ...data, description: translatedDescription }
        } catch {
          return { ...data, description: null, untranslatedDescription: cleanSynopsis(data.description) }
        }
      })
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
    anime.coverImage ||
    FALLBACK

  const title      = details?.title?.romaji || details?.title?.english || anime.title || '—'
  const titleJp    = details?.title?.native || ''
  const synopsis   = details?.description || (details?.untranslatedDescription ? 'Tradução em português indisponível.' : 'Sem sinopse disponível.')
  const score      = details?.averageScore
  const episodes   = details?.episodes
  const status_str = details?.status || anime.status || ''
  const type       = details?.format || ''
  const studios    = details?.studios?.nodes?.map((s) => s.name).join(', ') || ''
  const genres     = details?.genres || []
  const streams    = anime.streams || []
  const isWatching = status?.watching
  const isAiring   = status_str === 'RELEASING' || status_str === 'Currently Airing'
  const hasScheduleInfo = anime.episodeNumber || anime.localDate || anime.scheduleSources?.length
  const watchedEpisodes = status?.watchedEpisodes || []
  const episodeCount = episodes || anime.episodes || 0
  const episodeButtons = episodeCount > 0 && episodeCount <= 150 ? Array.from({ length: episodeCount }, (_, index) => index + 1) : []
  const enteredEpisode = Number(episodeInput)
  const validEpisode = Number.isInteger(enteredEpisode) && enteredEpisode > 0 && (!episodeCount || enteredEpisode <= episodeCount)
  const enteredEpisodeWatched = validEpisode && watchedEpisodes.includes(enteredEpisode)

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
                  {details?.untranslatedDescription && <details className="modal__original-synopsis"><summary>Ver sinopse original</summary><p>{details.untranslatedDescription}</p></details>}
                </>
              )}

              {hasScheduleInfo && (
                <>
                  <div className="modal__divider" />
                  <section className="modal__schedule-info">
                    <p className="modal__synopsis-label">Informações de exibição</p>
                    {anime.episodeNumber && <p><strong>Próximo episódio:</strong> EP {anime.episodeNumber}</p>}
                    {anime.localDate && <p><strong>Data e horário:</strong> {new Date(anime.airingAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long' })} · {anime.localTime || 'a confirmar'} BRT</p>}
                    {anime.platform && <p><strong>Plataforma:</strong> {anime.platform}</p>}
                    {anime.timingConfidence === 'conflicting' && <p><strong>Atenção:</strong> as fontes divergem. Exibimos o horário da fonte prioritária; confirme antes de se programar.</p>}
                    {anime.scheduleSources?.length > 0 && <p><strong>Fontes:</strong> {anime.scheduleSources.map((source) => {
                      const date = source.airingAt ? new Date(source.airingAt) : null
                      const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'sem horário'
                      return `${source.name}: ${when}${source.estimated ? ' (estimado)' : ''}`
                    }).join(' · ')}</p>}
                  </section>
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
                <button className={`modal__action-btn ${status?.favorite ? 'active-favorite' : ''}`} onClick={() => onFavorite?.(anime)}>
                  {status?.favorite ? '♥ Favorito' : '♡ Favoritar'}
                </button>
              </div>

              <div className="modal__divider" />
              <section className="modal__progress">
                <div className="modal__progress-heading"><p className="modal__synopsis-label">Progresso por episódio</p><span>{watchedEpisodes.length}{episodeCount ? ` de ${episodeCount}` : ''} assistidos</span></div>
                <p className="modal__progress-help">Cada ação altera somente o episódio escolhido.</p>
                {episodeButtons.length > 0 ? <div className="modal__episode-grid">{episodeButtons.map((episode) => <button key={episode} className={watchedEpisodes.includes(episode) ? 'watched' : ''} onClick={() => onToggleEpisode?.(anime, episode)} aria-pressed={watchedEpisodes.includes(episode)}>EP {episode}</button>)}</div> : <form className="modal__episode-picker" onSubmit={(event) => { event.preventDefault(); if (validEpisode) onToggleEpisode?.(anime, enteredEpisode) }}><label htmlFor="episode-number">Número do episódio</label><div><input id="episode-number" type="number" inputMode="numeric" min="1" max={episodeCount || undefined} value={episodeInput} onChange={(event) => setEpisodeInput(event.target.value)} /><button type="submit" disabled={!validEpisode}>{enteredEpisodeWatched ? 'Desmarcar episódio' : 'Marcar como visto'}</button></div></form>}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
