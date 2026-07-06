import { useCallback, useMemo, useState } from 'react'
import Calendar from './components/Calendar'
import SeasonGrid from './components/SeasonGrid'
import Sidebar from './components/Sidebar'
import AnimeModal from './components/AnimeModal'
import { useAnimeStatus } from './hooks/useAnimeStatus'
import { useAnimeSchedule } from './hooks/useAnimeSchedule'
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
  const [selectedAnime, setSelectedAnime] = useState(null)
  const closeModal = useCallback(() => setSelectedAnime(null), [])

  const { toggleStatus, getStatus, statusMap } = useAnimeStatus()
  const { schedule, loading: scheduleLoading, error: scheduleError } = useAnimeSchedule(isNextWeek ? 1 : 0)

  const today = new Date()
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  // A sidebar "Minha Lista" usa apenas os dados do calendário
  const calendarAnimes = useMemo(
    () => Object.values(schedule).flat(),
    [schedule],
  )

  // Quantos animes estão marcados como "Assistindo" (badge da Minha Lista)
  const totalMarked = useMemo(
    () => calendarAnimes.filter((a) => statusMap[getAnimeKey(a)]?.watching).length,
    [calendarAnimes, statusMap],
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">
          <span className="app-header__icon">⛩</span>
          <span className="app-header__title-text">AniCal</span>
        </h1>

        <p className="app-header__subtitle">
          Acompanhe os lançamentos semanais de animes e onde assistir
        </p>

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

          <div className="header-actions">
            <button
              className="sidebar-toggle-btn"
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir lista"
            >
              ☰ Minha Lista
              {totalMarked > 0 && (
                <span className="sidebar-badge">{totalMarked}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <Sidebar
          allAnimes={calendarAnimes}
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
              today={today.getDay()}
              isNextWeek={isNextWeek}
              setIsNextWeek={setIsNextWeek}
              onAnimeClick={setSelectedAnime}
            />
          )}

          {activeTab === 'season' && (
            <SeasonGrid
              activeFilter={seasonFilter}
              onFilterChange={setSeasonFilter}
              onToggle={toggleStatus}
              getStatus={getStatus}
              onAnimeClick={setSelectedAnime}
            />
          )}
        </main>
      </div>

      {selectedAnime && (
        <AnimeModal
          anime={selectedAnime}
          status={getStatus(selectedAnime)}
          onToggle={toggleStatus}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
