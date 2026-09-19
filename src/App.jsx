import { useCallback, useEffect, useState } from 'react'
import Calendar from './components/Calendar'
import SeasonGrid from './components/SeasonGrid'
import Movies from './components/Movies'
import AnimeModal from './components/AnimeModal'
import AuthModal from './components/AuthModal'
import AccountMenu from './components/AccountMenu'
import Library from './components/Library'
import { useAuth } from './hooks/useAuth'
import { useUserLibrary } from './hooks/useUserLibrary'
import { useAnimeSchedule } from './hooks/useAnimeSchedule'
import { readPendingAction, storePendingAction } from './services/authApi'
import './styles/App.css'

const TABS = [
  { key: 'calendar', label: '📅 Calendário' },
  { key: 'season',   label: '🎌 Temporada'  },
  { key: 'movies',   label: '🎬 Filmes'     },
]

export default function App() {
  const [activeTab, setActiveTab]       = useState('calendar')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [weekOffset, setWeekOffset]     = useState(0)
  const [selectedAnime, setSelectedAnime] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeModal = useCallback(() => setSelectedAnime(null), [])
  const { user } = useAuth()
  const requestSignIn = useCallback((action) => { storePendingAction(action); setAuthOpen(true) }, [])
  const { entries, loading: libraryLoading, error: libraryError, getStatus, toggleWatching, toggleFavorite, setStatus, toggleEpisode, markThroughEpisode, remove } = useUserLibrary(user, requestSignIn)
  const { schedule, items: scheduleItems, range: scheduleRange, loading: scheduleLoading, error: scheduleError, partial: schedulePartial, updatedAt: scheduleUpdatedAt, now: scheduleNow, refresh: refreshSchedule } = useAnimeSchedule(weekOffset)

  const today = new Date()
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  useEffect(() => {
    if (!user) return undefined
    const timer = window.setTimeout(() => {
      const pending = readPendingAction()
      if (!pending?.anime) return
      if (pending.action === 'favorite') toggleFavorite(pending.anime)
      if (pending.action === 'watching') toggleWatching(pending.anime)
      if (pending.action?.type === 'episode' && pending.action.episodeNumber) toggleEpisode(pending.anime, pending.action.episodeNumber)
      if (pending.action?.type === 'episodes-through' && pending.action.episodeNumber) markThroughEpisode(pending.anime, pending.action.episodeNumber)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [markThroughEpisode, toggleEpisode, toggleFavorite, toggleWatching, user])

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

          <div className="header-actions"><AccountMenu user={user} onSignIn={() => setAuthOpen(true)} onOpenLibrary={() => setActiveTab('library')} /></div>
        </div>
      </header>

      <div className="app-layout">
        <main className="app-main">
          {activeTab === 'calendar' && (
            <Calendar
              schedule={schedule}
              items={scheduleItems}
              range={scheduleRange}
              loading={scheduleLoading}
              error={scheduleError}
              partial={schedulePartial}
              updatedAt={scheduleUpdatedAt}
              now={scheduleNow}
              refresh={refreshSchedule}
              onToggle={toggleWatching}
              onFavorite={toggleFavorite}
              getStatus={getStatus}
              weekOffset={weekOffset}
              setWeekOffset={setWeekOffset}
              onAnimeClick={setSelectedAnime}
            />
          )}

          {activeTab === 'season' && (
            <SeasonGrid
              activeFilter={seasonFilter}
              onFilterChange={setSeasonFilter}
              onToggle={toggleWatching}
              onFavorite={toggleFavorite}
              getStatus={getStatus}
              onAnimeClick={setSelectedAnime}
            />
          )}

          {activeTab === 'movies' && (
            <Movies
              getStatus={getStatus}
              onToggle={toggleWatching}
              onFavorite={toggleFavorite}
              onAnimeClick={setSelectedAnime}
            />
          )}

          {activeTab === 'library' && user && <Library entries={entries} loading={libraryLoading} onStatusChange={setStatus} onFavorite={toggleFavorite} onRemove={remove} onAnimeClick={setSelectedAnime} />}
          {activeTab === 'library' && !user && <div className="library-empty"><strong>Entre para ver sua lista.</strong><button className="account-login" onClick={() => setAuthOpen(true)}>Entrar</button></div>}
          {libraryError && <p className="weekly-notice">Não foi possível sincronizar sua lista: {libraryError}</p>}
        </main>
      </div>

      {selectedAnime && (
        <AnimeModal
          anime={selectedAnime}
          status={getStatus(selectedAnime)}
          onToggle={toggleWatching}
          onFavorite={toggleFavorite}
          onToggleEpisode={toggleEpisode}
          onMarkThroughEpisode={markThroughEpisode}
          onClose={closeModal}
        />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
