import { useEffect, useState } from 'react'
import AnimeCard from './AnimeCard'
import '../styles/Calendar.css'

const DAYS = [
  { key: 'monday',    label: 'Segunda', short: 'SEG' },
  { key: 'tuesday',   label: 'Terça',   short: 'TER' },
  { key: 'wednesday', label: 'Quarta',  short: 'QUA' },
  { key: 'thursday',  label: 'Quinta',  short: 'QUI' },
  { key: 'friday',    label: 'Sexta',   short: 'SEX' },
  { key: 'saturday',  label: 'Sábado',  short: 'SÁB' },
  { key: 'sunday',    label: 'Domingo', short: 'DOM' },
]

const WEEK_MAP = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

export default function Calendar({
  schedule,
  loading,
  error,
  onToggle,
  getStatus,
  today,
  isNextWeek,
  setIsNextWeek,
  onAnimeClick,
}) {
  const todayKey = WEEK_MAP[today]

  // Qual dia está aberto na tela. Começa em "hoje" (nesta semana) ou
  // na segunda (quando o usuário olha a próxima semana).
  const [selectedDay, setSelectedDay] = useState(isNextWeek ? 'monday' : todayKey)

  // Ao trocar de semana, volta para o dia padrão daquela semana.
  useEffect(() => {
    setSelectedDay(isNextWeek ? 'monday' : todayKey)
  }, [isNextWeek, todayKey])

  // Calcula a data de cada dia da semana exibida (segunda → domingo).
  const targetDate = new Date()
  if (isNextWeek) targetDate.setDate(targetDate.getDate() + 7)

  const startOfWeek = new Date(targetDate)
  const diffToMonday = (targetDate.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday)

  const weekDates = DAYS.map((_, index) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + index)
    return date
  })

  if (loading) {
    // "Esqueletos": placeholders com o formato dos cards enquanto os dados
    // chegam. Passa uma sensação de app mais rápido do que um spinner girando.
    return (
      <div className="calendar-container">
        <div className="day-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="card-skeleton" key={i}>
              <div className="card-skeleton__poster skeleton-shimmer" />
              <div className="card-skeleton__line skeleton-shimmer" />
              <div className="card-skeleton__line card-skeleton__line--short skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="calendar-status calendar-status--error">
        <p>⚠️ {error}</p>
        <small>Verifique se sua API key está correta no arquivo .env</small>
      </div>
    )
  }

  const selectedIndex = DAYS.findIndex((d) => d.key === selectedDay)
  const selectedInfo = DAYS[selectedIndex]
  const selectedDate = weekDates[selectedIndex]
  const animesDoDia = schedule[selectedDay] || []
  const isSelectedToday = !isNextWeek && selectedDay === todayKey

  // Um episódio "já saiu" se o horário dele já passou. Só faz sentido na
  // semana atual (na próxima semana as datas ainda não chegaram).
  const agora = new Date()
  const jaSaiu = (anime) =>
    !isNextWeek && anime.episodeDate && new Date(anime.episodeDate) < agora

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <span className="calendar-week-label">
          {isNextWeek ? 'Próxima semana' : 'Esta semana'}
          {' · '}
          {weekDates[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
        </span>

        <button
          className="week-toggle-btn"
          onClick={() => setIsNextWeek(!isNextWeek)}
          aria-label={isNextWeek ? 'Voltar para esta semana' : 'Ver próxima semana'}
        >
          {isNextWeek ? 'Esta Semana' : 'Próxima Semana'}
        </button>
      </div>

      {/* Seletor de dias — clica no dia para ver só os animes dele */}
      <div className="day-selector" role="tablist" aria-label="Dias da semana">
        {DAYS.map((day, index) => {
          const count = (schedule[day.key] || []).length
          const isActive = day.key === selectedDay
          const isTodayBtn = !isNextWeek && day.key === todayKey
          return (
            <button
              key={day.key}
              role="tab"
              aria-selected={isActive}
              className={
                'day-selector__btn' +
                (isActive ? ' day-selector__btn--active' : '') +
                (isTodayBtn ? ' day-selector__btn--today' : '')
              }
              onClick={() => setSelectedDay(day.key)}
            >
              <span className="day-selector__short">{day.short}</span>
              <span className="day-selector__date">{weekDates[index].getDate()}</span>
              <span className="day-selector__count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo do dia selecionado */}
      <div className="day-view">
        <div className="day-view__header">
          <h3 className="day-view__name">
            {selectedInfo.label}
            {isSelectedToday && <span className="day-view__today-tag">Hoje</span>}
          </h3>
          <span className="day-view__date">
            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            {' · '}
            {animesDoDia.length} {animesDoDia.length === 1 ? 'anime' : 'animes'}
          </span>
        </div>

        {animesDoDia.length === 0 ? (
          <p className="day-view__empty">Nenhum anime neste dia 🌙</p>
        ) : (
          <div className="day-grid">
            {animesDoDia.map((anime, index) => (
              <AnimeCard
                key={anime.route || anime.mal_id || `${anime.title}-${index}`}
                anime={anime}
                status={getStatus(anime)}
                onToggle={onToggle}
                onClick={onAnimeClick}
                aired={jaSaiu(anime)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
