import { useCallback, useEffect, useState } from 'react'
import Calendar from './components/Calendar'
import SeasonGrid from './components/SeasonGrid'
import Movies from './components/Movies'
import AnimeModal from './components/AnimeModal'
import AuthModal from './components/AuthModal'
import AccountMenu from './components/AccountMenu'
import Library from './components/Library'
import MobileNav from './components/MobileNav'
import { useAuth } from './hooks/useAuth'
import { useUserLibrary } from './hooks/useUserLibrary'
import { useAnimeSchedule } from './hooks/useAnimeSchedule'
import { readPendingAction, storePendingAction } from './services/authApi'
import './styles/App.css'

const TABS = [
  { key: 'calendar', label: 'Agenda' },
  { key: 'season', label: 'Temporada' },
  { key: 'movies', label: 'Filmes' },
  { key: 'library', label: 'Minha lista' },
]

export default function App() {
  const [activeTab, setActiveTab]       = useState('calendar')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [weekOffset, setWeekOffset]     = useState(0)
  const [selectedAnime, setSelectedAnime] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeModal = useCallback(() => setSelectedAnime(null), [])
  const selectTab = useCallback((tab) => {
    setActiveTab(tab)
    if (window.matchMedia('(max-width: 640px)').matches) window.scrollTo(0, 0)
  }, [])
  const { user } = useAuth()
  const requestSignIn = useCallback((action) => { storePendingAction(action); setAuthOpen(true) }, [])
  const { entries, loading: libraryLoading, error: libraryError, getStatus, toggleWatching, toggleFavorite, setStatus, remove } = useUserLibrary(user, requestSignIn)
  const { schedule, items: scheduleItems, range: scheduleRange, loading: scheduleLoading, error: scheduleError, partial: schedulePartial, updating: scheduleUpdating, stale: scheduleStale, updatedAt: scheduleUpdatedAt, now: scheduleNow, refresh: refreshSchedule } = useAnimeSchedule(weekOffset)

  useEffect(() => {
    if (!user) return undefined
    const timer = window.setTimeout(() => {
      const pending = readPendingAction()
      if (!pending?.anime) return
      if (pending.action === 'favorite') toggleFavorite(pending.anime)
      if (pending.action === 'watching') toggleWatching(pending.anime)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [toggleFavorite, toggleWatching, user])

  return (
    <div className={`app app--${activeTab}`}>
      <header className="app-header">
        <h1 className="app-header__title">
          <span className="app-header__icon">⛩</span>
          <span className="app-header__title-text">AniCal</span>
        </h1>

        <div className="app-tabs-wrapper">
          <nav className="app-tabs" aria-label="Navegação principal">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`app-tab ${activeTab === tab.key ? 'app-tab--active' : ''}`}
                onClick={() => selectTab(tab.key)}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="header-actions"><AccountMenu user={user} onSignIn={() => setAuthOpen(true)} onOpenLibrary={() => selectTab('library')} /></div>
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
              updating={scheduleUpdating}
              stale={scheduleStale}
              updatedAt={scheduleUpdatedAt}
              now={scheduleNow}
              refresh={refreshSchedule}
              onToggle={toggleWatching}
              onFavorite={toggleFavorite}
              getStatus={getStatus}
              weekOffset={weekOffset}
              setWeekOffset={setWeekOffset}
              onAnimeClick={setSelectedAnime}
              user={user}
              libraryLoading={libraryLoading}
              onSignIn={() => setAuthOpen(true)}
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

      <MobileNav activeTab={activeTab} onSelect={selectTab} />

      {selectedAnime && (
        <AnimeModal
          anime={selectedAnime}
          status={getStatus(selectedAnime)}
          onToggle={toggleWatching}
          onFavorite={toggleFavorite}
          onClose={closeModal}
        />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
