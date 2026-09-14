import '../styles/AnimeCard.css'

const FALLBACK = 'https://placehold.co/300x420?text=?'
const CONFIDENCE = { confirmed: ['● Confirmado', 'anime-card__confidence--confirmed'], corroborated: ['● Confirmado por fontes', 'anime-card__confidence--corroborated'], estimated: ['◷ Estimado', 'anime-card__confidence--estimated'], conflicting: ['⚠ Horário divergente', 'anime-card__confidence--conflicting'] }

export default function AnimeCard({ anime, status, onToggle, onClick, temporalStatus }) {
  const time = anime.localTime ? `${anime.timingConfidence === 'estimated' ? '~' : ''}${anime.localTime}` : 'A confirmar'
  const confidence = CONFIDENCE[anime.timingConfidence] || CONFIDENCE.estimated
  const image = anime.coverImage || FALLBACK
  const sourceLabel = anime.platform || anime.streams?.[0]?.name || 'Streaming a definir'
  return <article className={`anime-card ${status?.watching ? 'anime-card--watching' : ''}`} onClick={() => onClick?.(anime)}>
    <div className="anime-card__poster"><img src={image} alt={anime.title} loading="lazy" onError={(event) => { event.currentTarget.src = FALLBACK }} />
      <div className="anime-card__poster-meta"><span>EP {anime.episodeNumber || '—'}</span><strong>{time}</strong></div>
      {anime.scheduleChanged && <span className="anime-card__changed">{anime.dateChanged ? 'DATA ALTERADA' : 'HORÁRIO ALTERADO'}</span>}
    </div>
    <div className="anime-card__info"><h3 className="anime-card__title">{anime.title}</h3><p className="anime-card__platform-name">{sourceLabel}</p>
      <div className="anime-card__bottom"><span className={`anime-card__confidence ${confidence[1]}`} title={anime.timingConfidence === 'estimated' ? 'Horário estimado. Pode sofrer alterações.' : undefined}>{confidence[0]}</span>{temporalStatus === 'soon' && <span className="anime-card__soon">Em breve</span>}</div>
      <div className="anime-card__actions"><button className={`anime-card__action-btn ${status?.watching ? 'active-watching' : ''}`} onClick={(event) => { event.stopPropagation(); onToggle(anime, 'watching') }}>{status?.watching ? '▶ Assistindo' : '▶ Assistir'}</button></div>
    </div>
  </article>
}
