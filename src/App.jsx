import { useMemo, useState } from 'react'
import Calendar from './components/Calendar'
import SeasonGrid from './components/SeasonGrid'
import Sidebar from './components/Sidebar'
import { useAnimeStatus } from './hooks/useAnimeStatus'
import { useAnimeSchedule } from './hooks/useAnimeSchedule'
import { useSeasonAnime } from './hooks/useSeasonAnime'
import { getAnimeKey } from './utils/animeKey'
import './styles/App.css'

const TABS = [
  { key: 'calendar', label: '📅 Calendário' },
  { key: 'season',   label: '🎌 Temporada'  },
]

export default function App() {
  const [activeTab, setActiveTab]       = useState('calendar')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [isNextWeek, setIsNextWeek]     = useState(false)

  const { toggleStatus, getStatus, statusMap } = useAnimeStatus()
  const { schedule, loading: scheduleLoading, error: scheduleError } = useAnimeSchedule(isNextWeek ? 1 : 0)
  const { animes: seasonAnimes } = useSeasonAnime()

  // 📅 DATA ATUAL FORMATADA
  const today = new Date()

  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  })

  // 📦 JUNTA TODOS OS ANIMES
  const calendarAnimes = useMemo(
    () => Object.values(schedule).flat(),
    [schedule],
  )

  const allAnimes = useMemo(() => {
    const map = new Map()

    for (const anime of [...seasonAnimes, ...calendarAnimes]) {
      const key = getAnimeKey(anime)
      if (key) map.set(key, anime)
    }

    return Array.from(map.values())
  }, [seasonAnimes, calendarAnimes])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">
          <span className="app-header__icon">⛩</span>
          Anime Calendar
        </h1>

        <p className="app-header__subtitle">
          Acompanhe os lançamentos semanais de animes e onde assistir
        </p>

        {/* 🔥 NOVO: BANNER DO DIA */}
        <div className="today-banner">
          📅 Hoje é {formattedDate}
        </div>

        <div className="app-tabs-wrapper">
          <nav className="app-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`app-tab ${activeTab === tab.key ? 'app-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            className="sidebar-toggle-btn"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir sidebar"
          >
            ☰ Favoritos
          </button>
        </div>
      </header>

      <div className="app-layout">
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <Sidebar
          allAnimes={allAnimes}
          statusMap={statusMap}
          onToggle={toggleStatus}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="app-main">
          {activeTab === 'calendar' && (
            <Calendar
              schedule={schedule}
              loading={scheduleLoading}
              error={scheduleError}
              onToggle={toggleStatus}
              getStatus={getStatus}
              today={today.getDay()} // 🔥 ESSENCIAL
              isNextWeek={isNextWeek}
              setIsNextWeek={setIsNextWeek}
            />
          )}

          {activeTab === 'season' && (
            <SeasonGrid
              animes={seasonAnimes}
              activeFilter={seasonFilter}
              onFilterChange={setSeasonFilter}
              onToggle={toggleStatus}
              getStatus={getStatus}
            />
          )}
        </main>
      </div>
    </div>
  )
}