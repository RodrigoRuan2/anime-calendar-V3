import { useEffect, useMemo, useRef, useState } from 'react'
import AnimeCard from './AnimeCard'
import { DAY_KEYS, getLocalScheduleFields, getTemporalStatus, SCHEDULE_TIMEZONE } from '../utils/weeklySchedule'
import { getMyWeekSummary } from '../utils/myWeek'
import '../styles/Calendar.css'

const DAYS = [
  { key: 'monday', label: 'Segunda', short: 'SEG' }, { key: 'tuesday', label: 'Terça', short: 'TER' },
  { key: 'wednesday', label: 'Quarta', short: 'QUA' }, { key: 'thursday', label: 'Quinta', short: 'QUI' },
  { key: 'friday', label: 'Sexta', short: 'SEX' }, { key: 'saturday', label: 'Sábado', short: 'SÁB' }, { key: 'sunday', label: 'Domingo', short: 'DOM' },
]

function labelForRange(range) {
  if (!range) return '—'
  const start = new Date(range.start)
  const end = new Date(new Date(range.end).getTime() - 1)
  const date = (value) => value.toLocaleDateString('pt-BR', { timeZone: SCHEDULE_TIMEZONE, day: 'numeric', month: 'short' }).replace('.', '').toUpperCase()
  return `${date(start)} – ${date(end)}`
}

export default function Calendar({ schedule, items = [], loading, error, partial, updating, stale, updatedAt, now, refresh, onToggle, onMarkThroughEpisode, onFavorite, getStatus, weekOffset, setWeekOffset, onAnimeClick, range, user, libraryLoading, onSignIn }) {
  const todayKey = getLocalScheduleFields(now, SCHEDULE_TIMEZONE).weekday
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const daySelectorRef = useRef(null)
  useEffect(() => {
    const selector = daySelectorRef.current
    const selected = selector?.querySelector('[aria-selected="true"]')
    if (!selector || !selected || !window.matchMedia('(max-width: 640px)').matches) return
    const selectorRect = selector.getBoundingClientRect()
    const selectedRect = selected.getBoundingClientRect()
    selector.scrollLeft += selectedRect.left - selectorRect.left - (selectorRect.width - selectedRect.width) / 2
  }, [loading, selectedDay, weekOffset])
  const weekDays = useMemo(() => {
    if (!range) return DAYS.map((day) => ({ ...day, date: '--' }))
    return DAYS.map((day, index) => {
      const date = new Date(new Date(range.start).getTime() + index * 86_400_000)
      return { ...day, date: date.toLocaleDateString('pt-BR', { timeZone: SCHEDULE_TIMEZONE, day: 'numeric' }) }
    })
  }, [range])
  const platforms = useMemo(() => [...new Set(items.map((item) => item.platform).filter(Boolean))].sort(), [items])
  const myWeek = useMemo(() => getMyWeekSummary(items, getStatus, now), [items, getStatus, now])
  const visibleItems = (schedule[selectedDay] || []).filter((anime) => {
    const status = getStatus(anime)
    const text = [anime.title, anime.titleEnglish, anime.titleRomaji].filter(Boolean).join(' ').toLowerCase()
    if (filter === 'watching' && !status.watching) return false
    if (filter === 'library' && !status.entry) return false
    if (platform !== 'all' && anime.platform !== platform) return false
    return !query || text.includes(query.toLowerCase())
  })
  const selected = weekDays.find((day) => day.key === selectedDay) || weekDays[0]
  const resetToday = () => { setWeekOffset(0); setSelectedDay(todayKey); setFilter('all') }
  const shiftWeek = (direction) => setWeekOffset((value) => value + direction)

  if (loading) return <div className="calendar-status"><div className="loader" /><p>Atualizando calendário...</p></div>
  if (error && !items.length) return <div className="calendar-status calendar-status--error"><p>⚠️ {error}</p><button onClick={refresh}>Tentar novamente</button></div>

  return (
    <section className="calendar-container">
      <header className="weekly-header">
        <div className="weekly-header__intro"><div><p className="weekly-header__eyebrow">Calendário semanal</p><h2>O que estreia nesta semana</h2><p className="weekly-header__period">{labelForRange(range)} · horários em Brasília</p></div><button className="weekly-header__today" onClick={resetToday}>Hoje</button></div>
        <div className="weekly-navigation">
          <button onClick={() => shiftWeek(-1)} aria-label="Semana anterior">←</button>
          <span className="weekly-range">{labelForRange(range)}</span>
          <button className="weekly-today" onClick={resetToday}>Hoje</button>
          <button onClick={() => shiftWeek(1)} aria-label="Próxima semana">→</button>
        </div>
      </header>
      {stale && !updating && <p className="weekly-notice">Não foi possível atualizar agora. Exibindo a última agenda salva.</p>}
      {partial && !stale && <p className="weekly-notice">Algumas informações podem estar indisponíveis. Exibindo fontes disponíveis.</p>}
      {updatedAt && <p className="weekly-updated">{updating ? 'Atualizando fontes · ' : 'Atualizado às '}{new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · BRT</p>}

      <div className="weekly-view-switch" role="group" aria-label="Visão da agenda">
        <button className={view === 'all' ? 'active' : ''} aria-pressed={view === 'all'} onClick={() => setView('all')}>Agenda completa</button>
        <button className={view === 'mine' ? 'active' : ''} aria-pressed={view === 'mine'} onClick={() => setView('mine')}>Minha semana</button>
      </div>

      {view === 'mine' ? (
        !user ? <div className="my-week-empty"><h3>Sua semana, do seu jeito</h3><p>Entre para ver somente os próximos episódios dos animes que você acompanha.</p><button onClick={onSignIn}>Entrar na minha conta</button></div>
          : libraryLoading ? <div className="calendar-status"><div className="loader" /><p>Carregando sua lista...</p></div>
            : <div className="my-week">
              <div className="my-week__summary">
                <div><p className="my-week__eyebrow">Sua programação</p><h3>{myWeek.followed.length} {myWeek.followed.length === 1 ? 'episódio na semana' : 'episódios na semana'}</h3><p>{myWeek.pendingCount} {myWeek.pendingCount === 1 ? 'episódio exibido para marcar' : 'episódios exibidos para marcar'}</p></div>
                {myWeek.next && <div className="my-week__next"><span>PRÓXIMO EPISÓDIO</span><strong>{myWeek.next.title}</strong><small>EP {myWeek.next.episodeNumber || '—'} · {new Date(myWeek.next.airingAt).toLocaleDateString('pt-BR', { timeZone: SCHEDULE_TIMEZONE, weekday: 'short', day: 'numeric', month: 'short' })} às {myWeek.next.localTime || 'horário a confirmar'} BRT</small></div>}
              </div>
              {!myWeek.followed.length ? <div className="my-week-empty"><h3>Nenhum anime acompanhado nesta semana</h3><p>Marque “Acompanhar” em um anime da agenda ou da temporada para vê-lo aqui.</p><button onClick={() => setView('all')}>Explorar agenda</button></div>
                : weekDays.map((day) => {
                  const dayItems = myWeek.followed.filter((anime) => anime.weekday === day.key)
                  if (!dayItems.length) return null
                  return <section className="my-week__day" key={day.key}><div className="day-view__header"><h3 className="day-view__name">{day.label}, {day.date}</h3><span className="day-view__date">{dayItems.length} {dayItems.length === 1 ? 'episódio' : 'episódios'}</span></div><div className="day-grid">{dayItems.map((anime) => <AnimeCard key={anime.id} anime={anime} status={getStatus(anime)} onToggle={onToggle} onMarkThroughEpisode={onMarkThroughEpisode} onFavorite={onFavorite} onClick={onAnimeClick} temporalStatus={getTemporalStatus(anime, now)} />)}</div></section>
                })}
            </div>
      ) : <>

      <div className="day-selector" role="tablist" aria-label="Dias da semana" ref={daySelectorRef}>
        {weekDays.map((day) => {
          const count = schedule[day.key]?.length || 0
          const isToday = weekOffset === 0 && day.key === todayKey
          return <button key={day.key} role="tab" aria-selected={selectedDay === day.key} className={`day-selector__btn ${selectedDay === day.key ? 'day-selector__btn--active' : ''} ${isToday ? 'day-selector__btn--today' : ''}`} onClick={() => setSelectedDay(day.key)}>
            <span className="day-selector__short">{day.short}</span><span className="day-selector__date">{day.date}</span><span className="day-selector__count">{isToday ? 'HOJE' : `${count}`}</span>
          </button>
        })}
      </div>

      <div className="weekly-filters">
        {['all', 'library', 'watching'].map((value) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{({ all: 'Todos', library: 'Minha lista', watching: 'Assistindo' })[value]}</button>)}
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filtrar plataforma"><option value="all">Todas plataformas</option>{platforms.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar anime..." aria-label="Buscar anime" />
      </div>

      <div className="weekly-mobile-toolbar">
        <div className="weekly-mobile-segment" aria-label="Filtrar calendário">
          <button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos</button>
          <button className={filter === 'library' ? 'active' : ''} aria-pressed={filter === 'library'} onClick={() => setFilter('library')}>Minha lista</button>
        </div>
        <button className={`weekly-mobile-filter-toggle ${filtersOpen || !['all', 'library'].includes(filter) || platform !== 'all' || query ? 'active' : ''}`} aria-expanded={filtersOpen} aria-controls="weekly-mobile-filters" onClick={() => setFiltersOpen((value) => !value)}>☷ Filtros</button>
      </div>
      {filtersOpen && <div className="weekly-mobile-filters" id="weekly-mobile-filters">
        <label>Mostrar<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos</option><option value="library">Minha lista</option><option value="watching">Assistindo</option></select></label>
        <label>Plataforma<select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="all">Todas plataformas</option>{platforms.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="weekly-mobile-filters__search">Buscar anime<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome do anime" /></label>
        <button className="weekly-mobile-filters__done" onClick={() => setFiltersOpen(false)}>Ver episódios</button>
      </div>}

      <div className="day-view__header"><h3 className="day-view__name">{selected.label}, {selected.date} {weekOffset === 0 && selectedDay === todayKey && <span className="day-view__today-tag">Hoje</span>}</h3><span className="day-view__date">{visibleItems.length} {visibleItems.length === 1 ? 'episódio' : 'episódios'}</span></div>
      {visibleItems.length === 0 ? <p className="day-view__empty">{filter === 'library' ? 'Nenhum anime da sua lista aparece neste dia.' : 'Não há episódios conhecidos para este dia.'}</p> : <div className="day-grid">{visibleItems.map((anime) => <AnimeCard key={anime.id} anime={anime} status={getStatus(anime)} onToggle={onToggle} onMarkThroughEpisode={onMarkThroughEpisode} onFavorite={onFavorite} onClick={onAnimeClick} temporalStatus={getTemporalStatus(anime, now)} />)}</div>}
      </>}
    </section>
  )
}
