import '../styles/AnimeCard.css'
import { formatScore, genreLabel } from '../utils/animeFilters'
import { getMovieReleaseInfo } from '../utils/movieRelease'

const FALLBACK = 'https://placehold.co/300x420?text=?'
const CONFIDENCE = { confirmed: ['● Confirmado', 'anime-card__confidence--confirmed'], corroborated: ['● Confirmado por fontes', 'anime-card__confidence--corroborated'], estimated: ['◷ Estimado', 'anime-card__confidence--estimated'], conflicting: ['⚠ Horário divergente', 'anime-card__confidence--conflicting'] }

export default function AnimeCard({ anime, status, onToggle, onFavorite, onClick, temporalStatus, movie = false, onPlan }) {
  const time = anime.localTime ? `${anime.timingConfidence === 'estimated' ? '~' : ''}${anime.localTime}` : 'A confirmar'
  const movieRelease = movie ? getMovieReleaseInfo(anime) : null
  const confidence = CONFIDENCE[anime.timingConfidence] || CONFIDENCE.estimated
  const confidenceLabel = anime.timingConfidence === 'conflicting' && anime.dateConflict ? '⚠ Data divergente' : confidence[0]
  const image = anime.coverImage || FALLBACK
  const sourceLabel = anime.platform || anime.streams?.[0]?.name || 'Streaming a definir'
  const releaseDate = anime.episodeDate ? new Date(anime.episodeDate) : null
  const mobileTime = releaseDate && !Number.isNaN(releaseDate.getTime()) && !anime.episodeNumber
    ? releaseDate.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    : time
  const primaryLabel = movie ? status?.entry ? '✓ Na minha lista' : '＋ Quero assistir'
    : status?.watching ? '✓ Acompanhando' : '＋ Acompanhar'
  const primaryAriaLabel = movie ? status?.entry ? `${anime.title} já está na minha lista` : `Adicionar ${anime.title} à minha lista`
    : status?.watching ? `Deixar de acompanhar ${anime.title}` : `Acompanhar ${anime.title}`
  const handlePrimaryAction = (event) => {
    event.stopPropagation()
    if (movie) { if (!status?.entry) onPlan?.(anime); return }
    onToggle(anime, 'watching')
  }
  return <article className={`anime-card ${status?.watching ? 'anime-card--watching' : ''}`} onClick={() => onClick?.(anime)}>
    <div className="anime-card__poster"><div className="anime-card__poster-blur" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" /><img src={image} alt={anime.title} loading="lazy" onError={(event) => { event.currentTarget.src = FALLBACK }} />
      <div className="anime-card__poster-meta">{movie ? <strong>{movieRelease.label}</strong> : <><span>EP {anime.episodeNumber || '—'}</span><strong>{time}</strong></> }</div>
      {anime.scheduleChanged && <span className="anime-card__changed">{anime.dateChanged ? 'DATA ALTERADA' : 'HORÁRIO ALTERADO'}</span>}
    </div>
    <div className="anime-card__info"><p className="anime-card__desktop-meta"><strong>{movie ? movieRelease.label : time}</strong>{!movie && <span>EP {anime.episodeNumber || '—'}</span>}</p><div className="anime-card__heading"><div className="anime-card__heading-copy"><p className="anime-card__mobile-meta">{movie ? movieRelease.label : mobileTime}{!movie && anime.episodeNumber ? ` · EP ${anime.episodeNumber}` : ''}</p><h3 className="anime-card__title"><button className="anime-card__open" type="button" onClick={(event) => { event.stopPropagation(); onClick?.(anime) }}>{anime.title}</button></h3></div><button className={`anime-card__favorite ${status?.favorite ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onFavorite?.(anime) }} aria-label={status?.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>{status?.favorite ? '♥' : '♡'}</button></div><p className="anime-card__platform-name">{sourceLabel}</p>
      <div className="anime-card__bottom"><span className={`anime-card__confidence ${movie ? 'anime-card__confidence--estimated' : confidence[1]}`} title={movie ? 'A data e a disponibilidade no Brasil podem mudar.' : anime.timingConfidence === 'estimated' ? 'Horário estimado. Pode sofrer alterações.' : anime.timingConfidence === 'conflicting' ? 'As fontes informam datas ou horários diferentes. Confira em Ver detalhes.' : undefined}>{movie ? movieRelease.phase === 'unknown' ? '◷ Dia não informado' : '◷ Data informada' : confidenceLabel}</span>{anime.genres?.[0] && <span className="anime-card__genre">{genreLabel(anime.genres[0])}</span>}{formatScore(anime.score) && <span className="anime-card__score" title={`Nota ${anime.scoreSource || 'da comunidade'}`}>★ {formatScore(anime.score)}/10</span>}{temporalStatus === 'soon' && <span className="anime-card__soon">Em breve</span>}</div>
      <div className="anime-card__actions">
        <button className={`anime-card__action-btn anime-card__action-btn--desktop ${status?.watching ? 'active-watching' : ''}`} aria-pressed={movie ? Boolean(status?.entry) : Boolean(status?.watching)} aria-label={primaryAriaLabel} onClick={handlePrimaryAction} disabled={movie && Boolean(status?.entry)}>{primaryLabel}</button>
        <button className="anime-card__details-btn" onClick={(event) => { event.stopPropagation(); onClick?.(anime) }}>Ver detalhes</button>
        <button className={`anime-card__action-btn anime-card__action-btn--mobile ${status?.watching ? 'active-watching' : ''}`} aria-pressed={movie ? Boolean(status?.entry) : Boolean(status?.watching)} aria-label={primaryAriaLabel} onClick={handlePrimaryAction} disabled={movie && Boolean(status?.entry)}>{primaryLabel}</button>
      </div>
    </div>
  </article>
}
