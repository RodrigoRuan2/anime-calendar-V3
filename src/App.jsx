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

  // Status compartilhado entre calendário, temporada e sidebar
  const { toggleStatus, getStatus, statusMap } = useAnimeStatus()

  // Busca animes do cronograma e da temporada
  const { schedule, loading: scheduleLoading, error: scheduleError } = useAnimeSchedule()
  const { animes: seasonAnimes } = useSeasonAnime()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      </header>

      {/* Layout com sidebar + conteúdo */}
      <div className="app-layout">
        <button
          className="sidebar-toggle-btn"
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir sidebar"
        >
          ☰ Favoritos
        </button>

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
