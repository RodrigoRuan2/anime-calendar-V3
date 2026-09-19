import { useMemo, useState } from 'react'
import '../styles/Library.css'

const TABS = [
  ['planejando', 'Planejando'], ['assistindo', 'Assistindo'], ['concluído', 'Concluídos'], ['pausado', 'Pausados'], ['abandonado', 'Abandonados'], ['favorites', 'Favoritos'],
]

function progress(entry) {
  const watched = entry.user_episode_progress?.length || 0
  return entry.total_episodes ? `${watched} de ${entry.total_episodes} episódios` : `${watched} episódio${watched === 1 ? '' : 's'} assistido${watched === 1 ? '' : 's'}`
}

export default function Library({ entries, loading, onStatusChange, onFavorite, onRemove, onAnimeClick }) {
  const [tab, setTab] = useState('planejando')
  const visible = useMemo(() => entries.filter((entry) => tab === 'favorites' ? entry.is_favorite : entry.status === tab), [entries, tab])
  return <section className="library-page">
    <header className="library-page__header"><p>Minha conta</p><h2>Minha lista</h2><span>Tudo o que você acompanha fica privado e sincronizado.</span></header>
    <nav className="library-tabs" aria-label="Listas pessoais">{TABS.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}<small>{entries.filter((entry) => key === 'favorites' ? entry.is_favorite : entry.status === key).length}</small></button>)}</nav>
    {loading ? <div className="library-empty">Carregando sua lista…</div> : visible.length === 0 ? <div className="library-empty"><strong>Sua lista está vazia aqui.</strong><span>Adicione animes pelo calendário, pela temporada ou pelos filmes.</span></div> : <div className="library-grid">{visible.map((entry) => <article className="library-card" key={entry.id} onClick={() => onAnimeClick?.({ id: entry.anilist_id, anilistId: entry.anilist_id, title: entry.title, coverImage: entry.cover_image, episodes: entry.total_episodes, format: entry.media_type })}><img src={entry.cover_image || 'https://placehold.co/300x420?text=?'} alt={entry.title} /><div className="library-card__body"><div><h3>{entry.title}</h3><p>{progress(entry)}</p></div><div className="library-card__actions"><select value={entry.status} onClick={(event) => event.stopPropagation()} onChange={(event) => onStatusChange({ id: entry.anilist_id, anilistId: entry.anilist_id, title: entry.title, coverImage: entry.cover_image, episodes: entry.total_episodes, format: entry.media_type }, event.target.value)}>{TABS.slice(0, 5).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button onClick={(event) => { event.stopPropagation(); onFavorite({ id: entry.anilist_id, anilistId: entry.anilist_id, title: entry.title, coverImage: entry.cover_image, episodes: entry.total_episodes, format: entry.media_type }) }} aria-label="Favoritar">{entry.is_favorite ? '♥' : '♡'}</button><button onClick={(event) => { event.stopPropagation(); onRemove(entry) }} aria-label="Remover da lista">×</button></div></div></article>)}</div>}
  </section>
}
