import { useEffect, useMemo, useRef, useState } from 'react'
import { formatScore, genreLabel } from '../utils/animeFilters'
import {
  DISCOVER_FORMAT_LABELS, DISCOVER_FORMATS, DISCOVER_GENRES, DISCOVER_STATUSES, DISCOVER_TOPICS,
  getAnimeRecommendations, matchesDiscoveryFilters, recommendationReasons,
} from '../services/recommendationApi'
import '../styles/Discover.css'

const INITIAL_FILTERS = {
  genres: ['Comedy'], topic: 'Isekai', score: '8', format: 'all',
  status: 'all', yearStart: '', yearEnd: '', maxEpisodes: '0',
  sort: 'score', excludeSaved: false,
}

const SCORE_OPTIONS = [
  ['0', 'Qualquer nota'], ['6', '6,0 ou mais'], ['7', '7,0 ou mais'],
  ['8', '8,0 ou mais'], ['9', '9,0 ou mais'],
]

const EPISODE_OPTIONS = [
  ['0', 'Qualquer duração'], ['12', 'Até 12 episódios'],
  ['24', 'Até 24 episódios'], ['50', 'Até 50 episódios'],
]

const FALLBACK_IMAGE = `${import.meta.env.BASE_URL}favicon.svg`

export default function Discover({ entries, user, getStatus, onFavorite, onToggle, onAnimeClick }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [result, setResult] = useState(null)
  const [appliedFilters, setAppliedFilters] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(12)
  const [spotlight, setSpotlight] = useState(null)
  const requestRef = useRef(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  const savedIds = useMemo(() => new Set(entries.map((entry) => String(entry.anilist_id))), [entries])
  const matches = useMemo(() => result && appliedFilters
    ? result.items.filter((anime) => matchesDiscoveryFilters(anime, appliedFilters, savedIds))
    : [], [result, appliedFilters, savedIds])

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const toggleGenre = (genre) => setFilters((current) => ({
    ...current,
    genres: current.genres.includes(genre)
      ? current.genres.filter((value) => value !== genre)
      : [...current.genres, genre],
  }))

  const search = async () => {
    const start = Number(filters.yearStart)
    const end = Number(filters.yearEnd)
    if (start && end && start > end) {
      setError('O ano inicial precisa ser menor ou igual ao ano final.')
      return
    }

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const selected = { ...filters, genres: [...filters.genres], excludeSaved: filters.excludeSaved && Boolean(user) }
    setLoading(true)
    setError(null)
    setSpotlight(null)
    try {
      const data = await getAnimeRecommendations(selected, { signal: controller.signal, savedIds })
      if (controller.signal.aborted) return
      setResult(data)
      setAppliedFilters(selected)
      setVisibleCount(12)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause.message || 'Não foi possível buscar animes agora.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const surprise = () => {
    if (!matches.length) return
    const choices = matches.filter((anime) => anime.id !== spotlight?.id)
    const pool = choices.length ? choices : matches
    setSpotlight(pool[Math.floor(Math.random() * pool.length)])
  }

  const hasUnappliedChanges = appliedFilters && JSON.stringify(filters) !== JSON.stringify(appliedFilters)

  return <section className="discover-page">
    <header className="discover-hero">
      <p>ENCONTRE SUA PRÓXIMA HISTÓRIA</p>
      <h2>Descubra animes <em>do seu jeito.</em></h2>
      <span>Combine seus gostos, explore várias opções e escolha o que assistir.</span>
    </header>

    <div className="discover-builder">
      <div className="discover-builder__heading"><h3>Monte seu pedido</h3><button type="button" onClick={() => setFilters({ ...INITIAL_FILTERS, genres: [] })}>Limpar filtros</button></div>
      <fieldset className="discover-genres">
        <legend>Gêneros <small>Escolha quantos quiser; todos devem combinar.</small></legend>
        <div>{DISCOVER_GENRES.map((genre) => <button key={genre} type="button" aria-pressed={filters.genres.includes(genre)} className={filters.genres.includes(genre) ? 'active' : ''} onClick={() => toggleGenre(genre)}>{genreLabel(genre)}</button>)}</div>
      </fieldset>

      <div className="discover-fields">
        <label>Tema<select value={filters.topic} onChange={(event) => updateFilter('topic', event.target.value)}>{DISCOVER_TOPICS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Nota mínima<select value={filters.score} onChange={(event) => updateFilter('score', event.target.value)}>{SCORE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Formato<select value={filters.format} onChange={(event) => updateFilter('format', event.target.value)}>{DISCOVER_FORMATS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Situação<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>{DISCOVER_STATUSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>De (ano)<input type="number" min="1950" max="2100" placeholder="Qualquer" value={filters.yearStart} onChange={(event) => updateFilter('yearStart', event.target.value)} /></label>
        <label>Até (ano)<input type="number" min="1950" max="2100" placeholder="Qualquer" value={filters.yearEnd} onChange={(event) => updateFilter('yearEnd', event.target.value)} /></label>
        <label>Duração<select value={filters.maxEpisodes} onChange={(event) => updateFilter('maxEpisodes', event.target.value)}>{EPISODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ordenar por<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="score">Melhor nota</option><option value="popular">Mais populares</option></select></label>
      </div>

      {user && <label className="discover-exclude"><input type="checkbox" checked={filters.excludeSaved} onChange={(event) => updateFilter('excludeSaved', event.target.checked)} /> Ocultar animes que já estão na minha lista</label>}
      <div className="discover-builder__actions"><button type="button" onClick={search} disabled={loading}>{loading ? 'Buscando animes…' : 'Encontrar animes →'}</button><span>Resultados da AniList; nenhuma conta necessária para pesquisar.</span></div>
    </div>

    {error && <p className="discover-message discover-message--error" role="alert">⚠️ {error} <button type="button" onClick={search}>Tentar novamente</button></p>}
    {loading && <div className="discover-message" role="status"><div className="loader" /> Buscando sugestões que combinam com você…</div>}
    {!loading && !error && !result && <div className="discover-message">Escolha os filtros e clique em “Encontrar animes”.</div>}
    {!loading && !error && result && <>
      <div className="discover-results__heading"><div><p>RESULTADOS</p><h3>{matches.length} {matches.length === 1 ? 'anime encontrado' : 'animes encontrados'}</h3></div><button type="button" onClick={surprise} disabled={!matches.length}>✦ Surpreenda-me</button></div>
      {hasUnappliedChanges && <p className="discover-note">Você alterou os filtros. Clique em “Encontrar animes” para aplicar as mudanças.</p>}
      {spotlight && <article className="discover-spotlight"><img src={spotlight.coverImage || FALLBACK_IMAGE} alt="" /><div><p>SUA SURPRESA</p><h4>{spotlight.title}</h4><span>★ {formatScore(spotlight.score) || 'Sem nota'}{spotlight.score ? '/10' : ''}</span><button type="button" onClick={() => onAnimeClick(spotlight)}>Ver detalhes</button></div><button type="button" className="discover-spotlight__close" onClick={() => setSpotlight(null)} aria-label="Fechar surpresa">×</button></article>}
      {matches.length === 0 ? <div className="discover-message">Não achamos títulos com essa combinação entre os resultados consultados. Experimente menos gêneros, uma nota menor ou um período maior.</div> : <>
        <div className="discover-grid">{matches.slice(0, visibleCount).map((anime) => {
          const status = getStatus(anime)
          const reasons = recommendationReasons(anime, appliedFilters)
          return <article className="discover-card" key={anime.id}>
            <button className="discover-card__poster" type="button" onClick={() => onAnimeClick(anime)} aria-label={`Ver detalhes de ${anime.title}`}><img src={anime.coverImage || FALLBACK_IMAGE} alt="" loading="lazy" /></button>
            <div className="discover-card__body"><p className="discover-card__meta">{anime.startDate?.year || 'Ano indefinido'} · {DISCOVER_FORMAT_LABELS[anime.format] || 'Anime'} · {anime.episodes ? `${anime.episodes} ${anime.episodes === 1 ? 'ep' : 'eps'}` : 'Episódios a confirmar'}</p><h4><button type="button" onClick={() => onAnimeClick(anime)}>{anime.title}</button></h4><strong>★ {formatScore(anime.score) || 'Sem nota'}{anime.score ? '/10' : ''}</strong><div className="discover-card__reasons">{(reasons.length ? reasons : anime.genres.slice(0, 2)).map((reason) => <span key={reason}>{genreLabel(reason)}</span>)}</div><div className="discover-card__actions"><button type="button" onClick={() => onToggle(anime)}>{status.watching ? '✓ Acompanhando' : '+ Acompanhar'}</button><button type="button" onClick={() => onFavorite(anime)} aria-label={status.favorite ? `Remover ${anime.title} dos favoritos` : `Favoritar ${anime.title}`}>{status.favorite ? '♥' : '♡'}</button></div></div>
          </article>
        })}</div>
        {visibleCount < matches.length && <button className="discover-more" type="button" onClick={() => setVisibleCount((count) => count + 12)}>Ver mais sugestões</button>}
      </>}
      <p className="discover-footnote">Pesquisa feita entre {result.candidatesChecked} títulos da AniList. Combinações muito específicas podem ter poucos resultados.</p>
    </>}
  </section>
}
