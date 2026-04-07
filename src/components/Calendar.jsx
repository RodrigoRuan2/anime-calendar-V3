import DayColumn from './DayColumn'
import '../styles/Calendar.css'

const DAYS = [
  { key: 'monday',    label: 'Segunda' },
  { key: 'tuesday',  label: 'Terça'   },
  { key: 'wednesday',label: 'Quarta'  },
  { key: 'thursday', label: 'Quinta'  },
  { key: 'friday',   label: 'Sexta'   },
  { key: 'saturday', label: 'Sábado'  },
  { key: 'sunday',   label: 'Domingo' },
]

export default function Calendar({ schedule, loading, error, onToggle, getStatus }) {

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
    <div className="calendar">
      {DAYS.map(({ key, label }) => (
        <DayColumn
          key={key}
          day={label}
          dayKey={key}
          animes={schedule[key] || []}
          onToggle={onToggle}
          getStatus={getStatus}
        />
      ))}
    </div>
  )
}
