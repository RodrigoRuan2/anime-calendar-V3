import { useMemo, useState } from 'react'
import AnimeCard from './AnimeCard'
import { DAY_KEYS, getLocalScheduleFields, getTemporalStatus, SCHEDULE_TIMEZONE } from '../utils/weeklySchedule'
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

export default function Calendar({ schedule, items = [], loading, error, partial, updatedAt, now, refresh, onToggle, getStatus, weekOffset, setWeekOffset, onAnimeClick, range }) {
  const todayKey = getLocalScheduleFields(now, SCHEDULE_TIMEZONE).weekday
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [filter, setFilter] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [query, setQuery] = useState('')
  const weekDays = useMemo(() => {
    if (!range) return DAYS.map((day) => ({ ...day, date: '--' }))
    return DAYS.map((day, index) => {
      const date = new Date(new Date(range.start).getTime() + index * 86_400_000)
      return { ...day, date: date.toLocaleDateString('pt-BR', { timeZone: SCHEDULE_TIMEZONE, day: 'numeric' }) }
    })
  }, [range])
  const platforms = useMemo(() => [...new Set(items.map((item) => item.platform).filter(Boolean))].sort(), [items])
  const visibleItems = (schedule[selectedDay] || []).filter((anime) => {
    const status = getStatus(anime)
    const text = [anime.title, anime.titleEnglish, anime.titleRomaji].filter(Boolean).join(' ').toLowerCase()
    if (filter === 'watching' && !status.watching) return false
    if (filter === 'today' && selectedDay !== todayKey) return false
    if (filter === 'upcoming' && !['upcoming', 'soon'].includes(getTemporalStatus(anime, now))) return false
    if (platform !== 'all' && anime.platform !== platform) return false
    return !query || text.includes(query.toLowerCase())
  })
  const selected = DAYS.find((day) => day.key === selectedDay) || DAYS[0]

  if (loading) return <div className="calendar-status"><div className="loader" /><p>Atualizando calendário...</p></div>
  if (error && !items.length) return <div className="calendar-status calendar-status--error"><p>⚠️ {error}</p><button onClick={refresh}>Tentar novamente</button></div>

  return (
    <section className="calendar-container">
      <header className="weekly-header">
        <div><p className="weekly-header__eyebrow">Calendário</p><h2>Seus lançamentos da semana</h2></div>
        <div className="weekly-navigation">
          <span className="weekly-range">{labelForRange(range)}</span>
          <button onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semana anterior">←</button>
          <button className="weekly-today" onClick={() => { setWeekOffset(0); setSelectedDay(todayKey) }}>Hoje</button>
          <button onClick={() => setWeekOffset((value) => value + 1)} aria-label="Próxima semana">→</button>
          <button onClick={refresh} aria-label="Atualizar calendário">↻</button>
        </div>
      </header>
      {partial && <p className="weekly-notice">Algumas informações podem estar indisponíveis. Exibindo fontes disponíveis.</p>}
      {updatedAt && <p className="weekly-updated">Atualizado às {new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · BRT</p>}

      <div className="day-selector" role="tablist" aria-label="Dias da semana">
        {weekDays.map((day) => {
          const count = schedule[day.key]?.length || 0
          const isToday = weekOffset === 0 && day.key === todayKey
          return <button key={day.key} role="tab" aria-selected={selectedDay === day.key} className={`day-selector__btn ${selectedDay === day.key ? 'day-selector__btn--active' : ''} ${isToday ? 'day-selector__btn--today' : ''}`} onClick={() => setSelectedDay(day.key)}>
            <span className="day-selector__short">{day.short}</span><span className="day-selector__date">{day.date}</span><span className="day-selector__count">{isToday ? 'HOJE' : `${count}`}</span>
          </button>
        })}
      </div>

      <div className="weekly-filters">
        {['all', 'watching', 'today', 'upcoming'].map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); if (value === 'today') setSelectedDay(todayKey) }}>{({ all: 'Todos', watching: 'Assistindo', today: 'Hoje', upcoming: 'Próximos' })[value]}</button>)}
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filtrar plataforma"><option value="all">Todas plataformas</option>{platforms.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar anime..." aria-label="Buscar anime" />
      </div>

      <div className="day-view__header"><h3 className="day-view__name">{selected.label} {weekOffset === 0 && selectedDay === todayKey && <span className="day-view__today-tag">Hoje</span>}</h3><span className="day-view__date">{visibleItems.length} {visibleItems.length === 1 ? 'episódio' : 'episódios'}</span></div>
      {visibleItems.length === 0 ? <p className="day-view__empty">Não há episódios conhecidos para este dia.</p> : <div className="day-grid">{visibleItems.map((anime) => <AnimeCard key={anime.id} anime={anime} status={getStatus(anime)} onToggle={onToggle} onClick={onAnimeClick} temporalStatus={getTemporalStatus(anime, now)} />)}</div>}
    </section>
  )
}
