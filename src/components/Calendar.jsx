import { useEffect, useState, useRef } from 'react'
import DayColumn from './DayColumn'
import '../styles/Calendar.css'

const DAYS = [
  { key: 'monday',    label: 'Segunda' },
  { key: 'tuesday',   label: 'Terça'   },
  { key: 'wednesday', label: 'Quarta'  },
  { key: 'thursday',  label: 'Quinta'  },
  { key: 'friday',    label: 'Sexta'   },
  { key: 'saturday',  label: 'Sábado'  },
  { key: 'sunday',    label: 'Domingo' },
]

// 🔥 MAPEAMENTO CORRETO DO JS → API
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
  today, // 👈 vindo do App
  isNextWeek,
  setIsNextWeek
}) {
  const [activeDayIndex, setActiveDayIndex] = useState(null)
  const calendarRef = useRef(null)

  const currentDate = new Date()
  const todayKey = WEEK_MAP[today]

  // 🔥 CÁLCULO DA SEMANA (ATUAL OU PRÓXIMA)
  const targetDate = new Date(currentDate)
  if (isNextWeek) {
    targetDate.setDate(targetDate.getDate() + 7) // Adiciona 7 dias
  }

  const startOfWeek = new Date(targetDate)
  const currentWeekday = targetDate.getDay()
  const diffToMonday = (currentWeekday + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday)

  const weekDates = DAYS.map((_, index) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + index)
    return date
  })

  // Encontrar índice do dia atual (só se for semana atual)
  const todayIndex = isNextWeek ? null : DAYS.findIndex(d => d.key === todayKey)

  // 🔥 SCROLL AUTOMÁTICO PRO DIA ATUAL (SÓ NA SEMANA ATUAL)
  useEffect(() => {
    if (!isNextWeek) {
      const el = document.querySelector('.day-column--today')
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        })
      }
    }
  }, [todayKey, isNextWeek])

  // 🔥 DETECTOR DE SCROLL PARA PAGINAÇÃO
  useEffect(() => {
    const handleScroll = () => {
      if (!calendarRef.current) return

      const calendar = calendarRef.current
      const scrollLeft = calendar.scrollLeft
      const cardWidth = calendar.offsetWidth

      // Detectar qual dia está no centro
      const currentIndex = Math.round(scrollLeft / cardWidth)
      setActiveDayIndex(currentIndex)
    }

    const calendar = calendarRef.current
    if (calendar) {
      calendar.addEventListener('scroll', handleScroll)
      // Set inicial baseado na semana
      setActiveDayIndex(isNextWeek ? 0 : todayIndex)
      return () => calendar.removeEventListener('scroll', handleScroll)
    }
  }, [todayIndex, isNextWeek])

  if (loading) {
    return (
      <div className="calendar-status">
        <div className="loader" />
        <p>Carregando cronograma...</p>
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

  return (
    <div className="calendar-container">
      {/* 🔥 HEADER COM CONTROLE DE SEMANA */}
      <div className="calendar-header">
        <div className="calendar-title">
          <h2>
            {isNextWeek ? 'Próxima Semana' : 'Esta Semana'}
          </h2>
          <span className="calendar-date-range">
            {weekDates[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        <button
          className="week-toggle-btn"
          onClick={() => setIsNextWeek(!isNextWeek)}
          aria-label={isNextWeek ? 'Voltar para esta semana' : 'Ver próxima semana'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 8L10 11L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isNextWeek ? 'Esta Semana' : 'Próxima Semana'}
        </button>
      </div>

      <div className="calendar-wrapper">
        <div className="calendar" ref={calendarRef}>
          {DAYS.map(({ key, label }, index) => (
            <DayColumn
              key={key}
              day={label}
              dayKey={key}
              dateLabel={weekDates[index].toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short'
              }).toUpperCase()}
              animes={schedule[key] || []}
              onToggle={onToggle}
              getStatus={getStatus}
              isToday={!isNextWeek && key === todayKey} // 🔥 SÓ MARCA HOJE NA SEMANA ATUAL
              className={`day-column--${key}`}
            />
          ))}
        </div>

        {/* 📍 PAGINAÇÃO - MOSTRAR SÓ NO CELULAR */}
        <div className="calendar-pagination">
          {DAYS.map((day, index) => (
            <button
              key={day.key}
              className={`pagination-dot ${index === activeDayIndex ? 'pagination-dot--active' : ''}`}
              onClick={() => {
                if (calendarRef.current) {
                  const cardWidth = calendarRef.current.offsetWidth
                  calendarRef.current.scrollLeft = cardWidth * index
                }
              }}
              aria-label={`Ir para ${day.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}