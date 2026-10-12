import { useEffect, useMemo, useRef, useState } from 'react'
import { formatScore, genreLabel } from '../utils/animeFilters'
import {
  DISCOVER_FORMAT_LABELS, DISCOVER_FORMATS, DISCOVER_GENRES, DISCOVER_PLATFORMS,
  DISCOVER_SOURCES, DISCOVER_STATUSES, DISCOVER_TOPICS,
  getAnimeRecommendations, getFavoriteTaste, matchesDiscoveryFilters,
  rankByFavoriteTaste, recommendationReasons,
} from '../services/recommendationApi'
import '../styles/Discover.css'

const EMPTY_FILTERS = {
  genres: [], excludedGenres: [], genreMode: 'all',
  topic: 'all', topicStrength: 'strong', score: '0',
  format: 'all', status: 'all', release: 'all',
  yearStart: '', yearEnd: '', maxEpisodes: '0', maxMinutes: '0',
  season: 'all', source: 'all', platform: 'all', sort: 'score',
  excludeSaved: false, excludeCompleted: false, avoidUnstartedSequels: false,
}
const INITIAL_FILTERS = { ...EMPTY_FILTERS, genres: ['Comedy'], topic: 'Isekai', score: '8' }
const SCORE_OPTIONS = [
  ['0', 'Qualquer nota'], ['6', '6,0 ou mais'], ['7', '7,0 ou mais'],
  ['8', '8,0 ou mais'], ['9', '9,0 ou mais'],
]
const EPISODE_OPTIONS = [
  ['0', 'Qualquer quantidade'], ['12', 'Até 12 episódios'],
  ['24', 'Até 24 episódios'], ['50', 'Até 50 episódios'],
]
const MINUTE_OPTIONS = [
  ['0', 'Qualquer duração'], ['15', 'Até 15 min/ep'],
  ['25', 'Até 25 min/ep'], ['45', 'Até 45 min/ep'],
]
const SEASON_OPTIONS = [
  ['all', 'Qualquer estação'], ['WINTER', 'Inverno'], ['SPRING', 'Primavera'],
  ['SUMMER', 'Verão'], ['FALL', 'Outono'],
]
const FALLBACK_IMAGE = `${import.meta.env.BASE_URL}favicon.svg`

function DiscoverCard({ anime, filters, getStatus, onFavorite, onToggle, onAnimeClick }) {
  const status = getStatus(anime)
  const reasons = recommendationReasons(anime, filters)
  return <article className="discover-card">
    <button className="discover-card__poster" type="button" onClick={() => onAnimeClick(anime)} aria-label={`Ver detalhes de ${anime.title}`}>
      <img src={anime.coverImage || FALLBACK_IMAGE} alt="" loading="lazy" />
    </button>
    <div className="discover-card__body">
      <p className="discover-card__meta">
        {anime.startDate?.year || 'Ano indefinido'} · {DISCOVER_FORMAT_LABELS[anime.format] || 'Anime'}
        {anime.episodes ? ` · ${anime.episodes} ${anime.episodes === 1 ? 'ep' : 'eps'}` : ''}
        {anime.duration ? ` · ${anime.duration} min/ep` : ''}
      </p>
      <h4><button type="button" onClick={() => onAnimeClick(anime)}>{anime.title}</button></h4>
      <strong>★ {formatScore(anime.score) || 'Sem nota'}{anime.score ? '/10' : ''}</strong>
      <div className="discover-card__reasons">{(reasons.length ? reasons : anime.genres.slice(0, 2)).map((reason) => <span key={reason}>{genreLabel(reason)}</span>)}</div>
      {anime.streams.length > 0 && <div className="discover-card__watch"><span>Onde assistir:</span>
        {anime.streams.slice(0, 2).map((stream) => <a key={stream.url} href={stream.url} target="_blank" rel="noopener noreferrer">{stream.name}</a>)}
        {anime.streams.length > 2 && <button type="button" onClick={() => onAnimeClick(anime)} aria-label={`Ver todas as plataformas de ${anime.title}`}>+{anime.streams.length - 2}</button>}
      </div>}
      <div className="discover-card__actions">
        <button type="button" onClick={() => onToggle(anime)}>{status.watching ? '✓ Acompanhando' : '+ Acompanhar'}</button>
        <button type="button" onClick={() => onFavorite(anime)} aria-label={status.favorite ? `Remover ${anime.title} dos favoritos` : `Favoritar ${anime.title}`}>{status.favorite ? '♥' : '♡'}</button>
      </div>
    </div>
  </article>
}

export default function Discover({ entries, user, getStatus, onFavorite, onToggle, onAnimeClick }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [result, setResult] = useState(null)
  const [appliedFilters, setAppliedFilters] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [pageError, setPageError] = useState(null)
  const [visibleCount, setVisibleCount] = useState(12)
  const [spotlight, setSpotlight] = useState(null)
  const requestRef = useRef(null)
  const tasteRef = useRef(null)
  const searchDateRef = useRef(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  const savedIds = useMemo(() => new Set(entries.map((entry) => String(entry.anilist_id))), [entries])
  const completedIds = useMemo(() => new Set(entries.filter((entry) => entry.status === 'concluído').map((entry) => String(entry.anilist_id))), [entries])
  const favoriteCount = entries.filter((entry) => entry.is_favorite).length
  const favoriteIds = useMemo(() => new Set(entries.filter((entry) => entry.is_favorite).map((entry) => String(entry.anilist_id))), [entries])
  const matches = useMemo(() => result && appliedFilters
    ? result.items.filter((anime) => matchesDiscoveryFilters(anime, appliedFilters, { savedIds, completedIds, favoriteIds }))
    : [], [result, appliedFilters, savedIds, completedIds, favoriteIds])
  const hasUnappliedChanges = appliedFilters && JSON.stringify(filters) !== JSON.stringify(appliedFilters)

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const toggleGenre = (genre, excluded = false) => setFilters((current) => {
    const key = excluded ? 'excludedGenres' : 'genres'
    const other = excluded ? 'genres' : 'excludedGenres'
    return {
      ...current,
      [key]: current[key].includes(genre) ? current[key].filter((value) => value !== genre) : [...current[key], genre],
      [other]: current[other].filter((value) => value !== genre),
    }
  })

  const search = async () => {
    const start = Number(filters.yearStart)
    const end = Number(filters.yearEnd)
    if (start && end && start > end) { setError('O ano inicial precisa ser menor ou igual ao ano final.'); return }
    if (filters.sort === 'forYou' && !favoriteCount) { setError('Favorite pelo menos um anime na sua lista para usar “Para mim”.'); return }
    if (filters.release === 'upcoming' && ['FINISHED', 'RELEASING'].includes(filters.status)) {
      setError('“Ainda vai estrear” não combina com “Finalizados” ou “Em exibição”.'); return
    }
    if (filters.release === 'released' && filters.status === 'NOT_YET_RELEASED') {
      setError('“Já estreou” não combina com “Ainda não lançados”.'); return
    }

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const selected = {
      ...filters, genres: [...filters.genres], excludedGenres: [...filters.excludedGenres],
      excludeSaved: filters.excludeSaved && Boolean(user),
      excludeCompleted: filters.excludeCompleted && Boolean(user),
      avoidUnstartedSequels: filters.avoidUnstartedSequels && Boolean(user),
    }
    const searchDate = new Date()
    setLoading(true)
    setError(null)
    setPageError(null)
    setSpotlight(null)
    try {
      const taste = selected.sort === 'forYou' ? await getFavoriteTaste(entries, controller.signal) : null
      if (selected.sort === 'forYou' && !taste?.preferredGenres.length) throw new Error('Não foi possível identificar os gêneros dos seus favoritos.')
      const data = await getAnimeRecommendations(selected, { signal: controller.signal, savedIds, completedIds, taste, now: searchDate })
      if (controller.signal.aborted) return
      tasteRef.current = taste
      searchDateRef.current = searchDate
      setResult(data)
      setAppliedFilters(selected)
      setVisibleCount(12)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause.message || 'Não foi possível buscar animes agora.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!result || loadingMore || hasUnappliedChanges) return
    if (visibleCount < matches.length) { setVisibleCount((count) => count + 12); return }
    if (!result.nextPage) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoadingMore(true)
    setPageError(null)
    try {
      const data = await getAnimeRecommendations(appliedFilters, {
        signal: controller.signal, savedIds, completedIds,
        startPage: result.nextPage, taste: tasteRef.current, now: searchDateRef.current,
      })
      if (controller.signal.aborted) return
      setResult((current) => {
        const seen = new Set(current.items.map((anime) => anime.id))
        const combined = [...current.items, ...data.items.filter((anime) => !seen.has(anime.id))]
        return {
          items: appliedFilters.sort === 'forYou' ? rankByFavoriteTaste(combined, tasteRef.current) : combined,
          nextPage: data.nextPage,
          pagesChecked: current.pagesChecked + data.pagesChecked,
          candidatesChecked: current.candidatesChecked + data.candidatesChecked,
        }
      })
      setVisibleCount((count) => count + 12)
    } catch (cause) {
      if (!controller.signal.aborted) setPageError(cause.message || 'Não foi possível carregar mais títulos.')
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }

  const surprise = () => {
    if (!matches.length) return
    const choices = matches.filter((anime) => anime.id !== spotlight?.id)
    const pool = choices.length ? choices : matches
    setSpotlight(pool[Math.floor(Math.random() * pool.length)])
  }

  return <section className="discover-page">
    <header className="discover-hero">
      <p>ENCONTRE SUA PRÓXIMA HISTÓRIA</p>
      <h2>Descubra animes <em>do seu jeito.</em></h2>
      <span>Combine seus gostos, explore várias opções e escolha o que assistir.</span>
    </header>

    <div className="discover-builder">
      <div className="discover-builder__heading"><h3>Monte seu pedido</h3><button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, genres: [], excludedGenres: [] })}>Limpar filtros</button></div>
      <fieldset className="discover-genres">
        <legend>Gêneros <small>{filters.genreMode === 'any' ? 'Basta combinar com um deles.' : 'Todos os escolhidos devem combinar.'}</small></legend>
        <div>{DISCOVER_GENRES.map((genre) => <button key={genre} type="button" aria-pressed={filters.genres.includes(genre)} className={filters.genres.includes(genre) ? 'active' : ''} onClick={() => toggleGenre(genre)}>{genreLabel(genre)}</button>)}</div>
      </fieldset>

      <div className="discover-fields">
        <label>Tema<select value={filters.topic} onChange={(event) => updateFilter('topic', event.target.value)}>{DISCOVER_TOPICS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Nota mínima<select value={filters.score} onChange={(event) => updateFilter('score', event.target.value)}>{SCORE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Formato<select value={filters.format} onChange={(event) => updateFilter('format', event.target.value)}>{DISCOVER_FORMATS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Situação<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>{DISCOVER_STATUSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Estreia<select value={filters.release} onChange={(event) => updateFilter('release', event.target.value)}><option value="all">Qualquer data</option><option value="released">Já estreou</option><option value="upcoming">Ainda vai estrear</option></select></label>
        <label>De (ano)<input type="number" min="1950" max="2100" placeholder="Qualquer" value={filters.yearStart} onChange={(event) => updateFilter('yearStart', event.target.value)} /></label>
        <label>Até (ano)<input type="number" min="1950" max="2100" placeholder="Qualquer" value={filters.yearEnd} onChange={(event) => updateFilter('yearEnd', event.target.value)} /></label>
        <label>Quantidade de episódios<select value={filters.maxEpisodes} onChange={(event) => updateFilter('maxEpisodes', event.target.value)}>{EPISODE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ordenar por<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="score">Melhor nota</option><option value="popular">Mais populares</option><option value="recent">Estreias mais recentes</option><option value="trending">Em alta</option><option value="hidden">Joias escondidas</option>{user && <option value="forYou" disabled={!favoriteCount}>Para mim (favoritos)</option>}</select></label>
      </div>
      {filters.sort === 'hidden' && <p className="discover-hint">Joias escondidas: nota de pelo menos 7,5 e presença em menos de 20 mil listas da AniList.</p>}
      {filters.sort === 'forYou' && <p className="discover-hint">Usamos os gêneros e temas de até 25 animes que você favoritou na sua lista.</p>}

      <details className="discover-advanced"><summary>Mais filtros e preferências</summary>
        <div className="discover-fields">
          <label>Combinar gêneros<select value={filters.genreMode} onChange={(event) => updateFilter('genreMode', event.target.value)}><option value="all">Todos (E)</option><option value="any">Qualquer um (OU)</option></select></label>
          <label>Força do tema<select value={filters.topicStrength} onChange={(event) => updateFilter('topicStrength', event.target.value)} disabled={filters.topic === 'all'}><option value="strong">Tema importante</option><option value="any">Mesmo secundário</option></select></label>
          <label>Estação da estreia<select value={filters.season} onChange={(event) => updateFilter('season', event.target.value)}>{SEASON_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Minutos por episódio<select value={filters.maxMinutes} onChange={(event) => updateFilter('maxMinutes', event.target.value)}>{MINUTE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Origem<select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>{DISCOVER_SOURCES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Plataforma<select value={filters.platform} onChange={(event) => updateFilter('platform', event.target.value)}>{DISCOVER_PLATFORMS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <fieldset className="discover-genres discover-genres--exclude"><legend>Evitar gêneros <small>Estes não aparecem nos resultados.</small></legend><div>{DISCOVER_GENRES.map((genre) => <button key={genre} type="button" aria-pressed={filters.excludedGenres.includes(genre)} className={filters.excludedGenres.includes(genre) ? 'active' : ''} onClick={() => toggleGenre(genre, true)}>{genreLabel(genre)}</button>)}</div></fieldset>
        {filters.platform !== 'all' && <p className="discover-hint">A AniList não confirma se a plataforma oferece o título no Brasil.</p>}
      </details>

      {user && <div className="discover-personal"><p>Minha lista</p>
        <label className="discover-exclude"><input type="checkbox" checked={filters.excludeSaved} onChange={(event) => updateFilter('excludeSaved', event.target.checked)} /> Ocultar todos os animes salvos</label>
        <label className="discover-exclude"><input type="checkbox" checked={filters.excludeCompleted} disabled={filters.excludeSaved} onChange={(event) => updateFilter('excludeCompleted', event.target.checked)} /> Ocultar os que já concluí</label>
        <label className="discover-exclude"><input type="checkbox" checked={filters.avoidUnstartedSequels} onChange={(event) => updateFilter('avoidUnstartedSequels', event.target.checked)} /> Evitar continuações cuja temporada anterior não concluí</label>
      </div>}
      <div className="discover-builder__actions"><button type="button" onClick={search} disabled={loading || loadingMore}>{loading ? 'Buscando animes…' : 'Encontrar animes →'}</button><span>Resultados da AniList; nenhuma conta necessária para pesquisar.</span></div>
    </div>

    {error && <p className="discover-message discover-message--error" role="alert">⚠️ {error} <button type="button" onClick={search}>Tentar novamente</button></p>}
    {loading && <div className="discover-message" role="status"><div className="loader" /> Buscando sugestões que combinam com você…</div>}
    {!loading && !error && !result && <div className="discover-message">Escolha os filtros e clique em “Encontrar animes”.</div>}
    {!loading && !error && result && <>
      <div className="discover-results__heading"><div><p>RESULTADOS</p><h3>{matches.length} {matches.length === 1 ? 'anime carregado' : 'animes carregados'}{result.nextPage ? ' até agora' : ''}</h3></div><button type="button" onClick={surprise} disabled={!matches.length}>✦ Surpreenda-me</button></div>
      {hasUnappliedChanges && <p className="discover-note">Você alterou os filtros. Clique em “Encontrar animes” para aplicar as mudanças.</p>}
      {spotlight && <article className="discover-spotlight"><img src={spotlight.coverImage || FALLBACK_IMAGE} alt="" /><div><p>SUA SURPRESA</p><h4>{spotlight.title}</h4><span>★ {formatScore(spotlight.score) || 'Sem nota'}{spotlight.score ? '/10' : ''}</span><button type="button" onClick={() => onAnimeClick(spotlight)}>Ver detalhes</button></div><button type="button" className="discover-spotlight__close" onClick={() => setSpotlight(null)} aria-label="Fechar surpresa">×</button></article>}
      {matches.length === 0 ? <div className="discover-message">Nenhum título encontrado nas páginas consultadas. {result.nextPage ? 'Você pode buscar mais páginas da AniList.' : 'Experimente filtros menos específicos.'}</div> : <div className="discover-grid">{matches.slice(0, visibleCount).map((anime) => <DiscoverCard key={anime.id} anime={anime} filters={appliedFilters} getStatus={getStatus} onFavorite={onFavorite} onToggle={onToggle} onAnimeClick={onAnimeClick} />)}</div>}
      {pageError && <p className="discover-note" role="alert">{pageError} Tente carregar mais novamente.</p>}
      {(visibleCount < matches.length || result.nextPage) && <button className="discover-more" type="button" onClick={loadMore} disabled={loadingMore || hasUnappliedChanges}>{loadingMore ? 'Consultando mais páginas…' : visibleCount < matches.length ? 'Mostrar mais sugestões' : 'Buscar mais na AniList'}</button>}
      <p className="discover-footnote">Consultamos {result.candidatesChecked} títulos em {result.pagesChecked} {result.pagesChecked === 1 ? 'página' : 'páginas'} da AniList. Isso não é o total do catálogo. Os links de streaming não garantem disponibilidade no Brasil.</p>
    </>}
  </section>
}
