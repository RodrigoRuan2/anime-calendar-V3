import { useMemo, useState } from 'react'
import '../styles/Library.css'

const TABS = [
  ['planejando', 'Planejando'], ['assistindo', 'Assistindo'], ['concluído', 'Concluídos'], ['favorites', 'Favoritos'],
]

function entryAnime(entry) {
  return { id: entry.anilist_id, anilistId: entry.anilist_id, title: entry.title, coverImage: entry.cover_image, episodes: entry.total_episodes, format: entry.media_type }
}

export default function Library({ entries, loading, onStatusChange, onFavorite, onRemove, onAnimeClick }) {
  const [tab, setTab] = useState('planejando')
  const visible = useMemo(() => entries.filter((entry) => tab === 'favorites' ? entry.is_favorite : entry.status === tab), [entries, tab])
  return <section className="library-page">
    <header className="library-page__header"><p>Minha conta</p><h2>Minha lista</h2><span>Tudo o que você acompanha fica privado e sincronizado.</span></header>
    <nav className="library-tabs" aria-label="Listas pessoais">{TABS.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}<small>{entries.filter((entry) => key === 'favorites' ? entry.is_favorite : entry.status === key).length}</small></button>)}</nav>
    {loading ? <div className="library-empty">Carregando sua lista…</div> : visible.length === 0 ? <div className="library-empty"><strong>Sua lista está vazia aqui.</strong><span>Adicione animes pelo calendário, pela temporada ou pelos filmes.</span></div> : <div className="library-grid">{visible.map((entry) => {
      const anime = entryAnime(entry)
      return <article className="library-card" key={entry.id} onClick={() => onAnimeClick?.(anime)}>
        <img src={entry.cover_image || 'https://placehold.co/300x420?text=?'} alt={entry.title} />
        <div className="library-card__body"><div><h3><button className="library-card__open" type="button" onClick={(event) => { event.stopPropagation(); onAnimeClick?.(anime) }}>{entry.title}</button></h3>{entry.total_episodes && <p>{entry.total_episodes} episódios</p>}</div><div className="library-card__actions">
          <select value={entry.status} aria-label={`Estado de ${entry.title}`} onClick={(event) => event.stopPropagation()} onChange={(event) => onStatusChange(anime, event.target.value)}>{TABS.slice(0, 3).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <button onClick={(event) => { event.stopPropagation(); onFavorite(anime) }} aria-label="Favoritar">{entry.is_favorite ? '♥' : '♡'}</button><button onClick={(event) => { event.stopPropagation(); onRemove(entry) }} aria-label="Remover da lista">×</button>
        </div></div>
      </article>
    })}</div>}
  </section>
}
