import '../styles/AnimeCard.css'

const FALLBACK = 'https://placehold.co/300x420?text=?'
const CONFIDENCE = { confirmed: ['● Confirmado', 'anime-card__confidence--confirmed'], corroborated: ['● Confirmado por fontes', 'anime-card__confidence--corroborated'], estimated: ['◷ Estimado', 'anime-card__confidence--estimated'], conflicting: ['⚠ Horário divergente', 'anime-card__confidence--conflicting'] }

export default function AnimeCard({ anime, status, onToggle, onMarkThroughEpisode, onFavorite, onClick, temporalStatus }) {
  const time = anime.localTime ? `${anime.timingConfidence === 'estimated' ? '~' : ''}${anime.localTime}` : 'A confirmar'
  const confidence = CONFIDENCE[anime.timingConfidence] || CONFIDENCE.estimated
  const image = anime.coverImage || FALLBACK
  const sourceLabel = anime.platform || anime.streams?.[0]?.name || 'Streaming a definir'
  const weeklyEpisode = Number(anime.episodeNumber)
  const hasWeeklyEpisode = Boolean(onMarkThroughEpisode && Number.isInteger(weeklyEpisode) && weeklyEpisode > 0)
  const caughtUp = hasWeeklyEpisode && (status?.watchedEpisodes?.filter((episode) => episode <= weeklyEpisode).length || 0) >= weeklyEpisode
  const releaseDate = anime.episodeDate ? new Date(anime.episodeDate) : null
  const mobileTime = releaseDate && !Number.isNaN(releaseDate.getTime()) && !anime.episodeNumber
    ? releaseDate.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    : time
  const primaryLabel = status?.watching && hasWeeklyEpisode
    ? caughtUp ? `Em dia até EP ${weeklyEpisode}` : `✓ Estou em dia até EP ${weeklyEpisode}`
    : status?.watching ? '▶ Assistindo' : '＋ Acompanhar'
  const primaryAction = () => {
    if (status?.watching && hasWeeklyEpisode && !caughtUp) onMarkThroughEpisode(anime, weeklyEpisode)
    else if (!hasWeeklyEpisode || !status?.watching) onToggle(anime, 'watching')
  }
  return <article className={`anime-card ${status?.watching ? 'anime-card--watching' : ''}`} onClick={() => onClick?.(anime)}>
    <div className="anime-card__poster"><img src={image} alt={anime.title} loading="lazy" onError={(event) => { event.currentTarget.src = FALLBACK }} />
      <div className="anime-card__poster-meta"><span>EP {anime.episodeNumber || '—'}</span><strong>{time}</strong></div>
      {anime.scheduleChanged && <span className="anime-card__changed">{anime.dateChanged ? 'DATA ALTERADA' : 'HORÁRIO ALTERADO'}</span>}
    </div>
    <div className="anime-card__info"><div className="anime-card__heading"><div className="anime-card__heading-copy"><p className="anime-card__mobile-meta">{mobileTime}{anime.episodeNumber ? ` · EP ${anime.episodeNumber}` : ''}</p><h3 className="anime-card__title"><button className="anime-card__open" type="button" onClick={(event) => { event.stopPropagation(); onClick?.(anime) }}>{anime.title}</button></h3></div><button className={`anime-card__favorite ${status?.favorite ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onFavorite?.(anime) }} aria-label={status?.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>{status?.favorite ? '♥' : '♡'}</button></div><p className="anime-card__platform-name">{sourceLabel}</p>
      <div className="anime-card__bottom"><span className={`anime-card__confidence ${confidence[1]}`} title={anime.timingConfidence === 'estimated' ? 'Horário estimado. Pode sofrer alterações.' : undefined}>{confidence[0]}</span>{temporalStatus === 'soon' && <span className="anime-card__soon">Em breve</span>}</div>
      <div className="anime-card__actions">
        <button className={`anime-card__action-btn anime-card__action-btn--desktop ${status?.watching ? 'active-watching' : ''}`} onClick={(event) => { event.stopPropagation(); onToggle(anime, 'watching') }}>{status?.watching ? '▶ Assistindo' : '▶ Assistir'}</button>
        <button className={`anime-card__action-btn anime-card__action-btn--mobile ${status?.watching ? 'active-watching' : ''}`} disabled={Boolean(status?.watching && hasWeeklyEpisode && caughtUp)} onClick={(event) => { event.stopPropagation(); primaryAction() }}>{primaryLabel}</button>
      </div>
    </div>
  </article>
}
