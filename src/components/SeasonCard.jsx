import { useEffect, useRef, useState } from 'react'
import { getReleaseLabel } from '../utils/season'
import { seasonAgendaDate } from '../utils/seasonAgenda'
import { getSynopsisPreview, translateSynopsis } from '../services/translationApi'
import { formatScore, genreLabel } from '../utils/animeFilters'
import '../styles/SeasonCard.css'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const FALLBACK = 'https://placehold.co/300x420?text=?'
const TYPE_LABEL = { new: 'Novo', sequel: 'Sequência', continuing: 'Continuação' }

export default function SeasonCard({ anime, targetSeason, status, onToggle, onFavorite, onClick }) {
  const imageUrl = anime.coverImage || (anime.imageVersionRoute ? `${IMAGE_BASE}${anime.imageVersionRoute}` : null) || anime.images?.jpg?.image_url
  const requestRef = useRef(null)
  const [showSynopsis, setShowSynopsis] = useState(false)
  const [loadingSynopsis, setLoadingSynopsis] = useState(false)
  const [synopsisError, setSynopsisError] = useState(false)
  const [description, setDescription] = useState(null)
  const preview = getSynopsisPreview(anime.description)
  const date = seasonAgendaDate(anime, targetSeason)
  const releaseText = date.kind === 'day' ? getReleaseLabel(anime, targetSeason)
    : date.kind === 'month' ? 'Dia a confirmar'
      : date.kind === 'airing' ? 'Em exibição' : 'Data a confirmar'

  useEffect(() => () => requestRef.current?.abort(), [])

  const toggleSynopsis = async (event) => {
    event.stopPropagation()
    if (showSynopsis) { setShowSynopsis(false); requestRef.current?.abort(); setLoadingSynopsis(false); return }
    setShowSynopsis(true)
    if (description || !preview) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoadingSynopsis(true)
    setSynopsisError(false)
    try {
      const translation = await translateSynopsis(preview, controller.signal)
      if (!controller.signal.aborted) setDescription(translation)
    } catch {
      if (!controller.signal.aborted) setSynopsisError(true)
    } finally {
      if (!controller.signal.aborted) setLoadingSynopsis(false)
    }
  }

  return (
    <article className={`season-agenda-card ${status.watching ? 'season-agenda-card--watching' : ''}`} onClick={onClick ? () => onClick(anime) : undefined}>
      <div className="season-agenda-card__date" aria-label={date.kind === 'day' ? `Dia ${date.day}, ${date.weekday}` : releaseText}>
        <strong>{date.kind === 'day' ? String(date.day).padStart(2, '0') : date.kind === 'airing' ? 'NO' : '—'}</strong>
        <span>{date.kind === 'day' ? date.weekday : date.kind === 'airing' ? 'AR' : date.kind === 'month' ? 'DIA' : 'DATA'}</span>
      </div>
      <div className="season-agenda-card__poster">
        <div className="season-agenda-card__poster-blur" style={{ backgroundImage: `url(${imageUrl || FALLBACK})` }} aria-hidden="true" />
        <img src={imageUrl || FALLBACK} alt={anime.title} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK }} />
      </div>
      <div className="season-agenda-card__info">
        <p className="season-agenda-card__eyebrow">{TYPE_LABEL[anime.releaseType] || 'Anime'} · {releaseText}</p>
        <h3 className="season-agenda-card__title"><button type="button" onClick={(event) => { event.stopPropagation(); onClick?.(anime) }}>{anime.title}</button></h3>
        {preview && <button className="season-agenda-card__synopsis-toggle" type="button" aria-expanded={showSynopsis} onClick={toggleSynopsis}>{showSynopsis ? 'Ocultar sinopse' : 'Ler sinopse'}</button>}
        {showSynopsis && (loadingSynopsis ? <p className="season-agenda-card__description">Traduzindo sinopse…</p> : synopsisError ? <p className="season-agenda-card__description">Tradução indisponível no momento.</p> : description && <p className="season-agenda-card__description">{description}</p>)}
        <div className="season-agenda-card__tags">
          {anime.genres?.slice(0, 2).map((genre) => <span key={genre}>{genreLabel(genre)}</span>)}
          {anime.episodes && <span>{anime.episodes} eps</span>}
        </div>
      </div>
      <div className="season-agenda-card__side">
        <div className="season-agenda-card__side-top">
          <span className="season-agenda-card__score" title={anime.scoreSource ? `Nota ${anime.scoreSource}` : undefined}>{formatScore(anime.score) ? `★ ${formatScore(anime.score)}/10` : 'Sem nota'}</span>
          <button className={`season-agenda-card__favorite ${status.favorite ? 'active' : ''}`} type="button" onClick={(event) => { event.stopPropagation(); onFavorite?.(anime) }} aria-label={status.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>{status.favorite ? '♥' : '♡'}</button>
        </div>
        <button className={`season-agenda-card__follow ${status.watching ? 'active-watching' : ''}`} type="button" aria-pressed={status.watching} onClick={(event) => { event.stopPropagation(); onToggle(anime, 'watching') }}>{status.watching ? '✓ Acompanhando' : '＋ Acompanhar'}</button>
        <button className="season-agenda-card__details" type="button" onClick={(event) => { event.stopPropagation(); onClick?.(anime) }}>Ver detalhes →</button>
      </div>
    </article>
  )
}
