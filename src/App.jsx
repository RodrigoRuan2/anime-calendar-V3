import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Calendar from './components/Calendar'
import AccountMenu from './components/AccountMenu'
import MobileNav from './components/MobileNav'
import { useAuth } from './hooks/useAuth'
import { useUserLibrary } from './hooks/useUserLibrary'
import { useAnimeSchedule } from './hooks/useAnimeSchedule'
import { readPendingAction, storePendingAction } from './services/authApi'
import './styles/App.css'

const SeasonGrid = lazy(() => import('./components/SeasonGrid'))
const Movies = lazy(() => import('./components/Movies'))
const Discover = lazy(() => import('./components/Discover'))
const Library = lazy(() => import('./components/Library'))
const AnimeModal = lazy(() => import('./components/AnimeModal'))
const AuthModal = lazy(() => import('./components/AuthModal'))

const TABS = [
  { key: 'calendar', label: 'Agenda' },
  { key: 'season', label: 'Temporada' },
  { key: 'movies', label: 'Filmes' },
  { key: 'discover', label: 'Descobrir' },
  { key: 'library', label: 'Minha lista' },
]
const TAB_KEYS = new Set(TABS.map((tab) => tab.key))

function tabFromUrl() {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return TAB_KEYS.has(tab) ? tab : 'calendar'
}

function CalendarView({ user, libraryLoading, getStatus, onToggle, onFavorite, onAnimeClick, onSignIn }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const { schedule, items, range, loading, error, partial, updating, stale, updatedAt, now, refresh } = useAnimeSchedule(weekOffset)
  return <Calendar
    schedule={schedule} items={items} range={range} loading={loading} error={error}
    partial={partial} updating={updating} stale={stale} updatedAt={updatedAt}
    now={now} refresh={refresh} onToggle={onToggle} onFavorite={onFavorite}
    getStatus={getStatus} weekOffset={weekOffset} setWeekOffset={setWeekOffset}
    onAnimeClick={onAnimeClick} user={user} libraryLoading={libraryLoading}
    onSignIn={onSignIn}
  />
}

export default function App() {
  const [activeTab, setActiveTab]       = useState(tabFromUrl)
  const [visitedTabs, setVisitedTabs] = useState(() => [tabFromUrl()])
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [selectedAnime, setSelectedAnime] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeModal = useCallback(() => setSelectedAnime(null), [])
  const selectTab = useCallback((tab) => {
    if (!TAB_KEYS.has(tab)) return
    const url = new URL(window.location.href)
    if (tab === 'calendar') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    if (url.href !== window.location.href) window.history.pushState({ tab }, '', url)
    setActiveTab(tab)
    setVisitedTabs((current) => current.includes(tab) ? current : [...current, tab])
    if (window.matchMedia('(max-width: 640px)').matches) window.scrollTo(0, 0)
  }, [])
  useEffect(() => {
    const onBackOrForward = () => {
      const tab = tabFromUrl()
      setActiveTab(tab)
      setVisitedTabs((current) => current.includes(tab) ? current : [...current, tab])
    }
    window.addEventListener('popstate', onBackOrForward)
    return () => window.removeEventListener('popstate', onBackOrForward)
  }, [])
  const { user } = useAuth()
  const requestSignIn = useCallback((action) => { storePendingAction(action); setAuthOpen(true) }, [])
  const { entries, loading: libraryLoading, error: libraryError, getStatus, toggleWatching, toggleFavorite, setStatus, remove } = useUserLibrary(user, requestSignIn)

  useEffect(() => {
    if (!user) return undefined
    const timer = window.setTimeout(() => {
      const pending = readPendingAction()
      if (!pending?.anime) return
      if (pending.action === 'favorite') toggleFavorite(pending.anime)
      if (pending.action === 'watching') toggleWatching(pending.anime)
      if (pending.action?.startsWith('status:')) setStatus(pending.anime, pending.action.slice(7))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [setStatus, toggleFavorite, toggleWatching, user])

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
          {visitedTabs.map((tab) => <div className="app-view" hidden={tab !== activeTab} key={tab}>
            <Suspense fallback={<div className="calendar-status"><div className="loader" /><p>Carregando seção...</p></div>}>
              {tab === 'calendar' && <CalendarView user={user} libraryLoading={libraryLoading} getStatus={getStatus} onToggle={toggleWatching} onFavorite={toggleFavorite} onAnimeClick={setSelectedAnime} onSignIn={() => setAuthOpen(true)} />}
              {tab === 'season' && <SeasonGrid activeFilter={seasonFilter} onFilterChange={setSeasonFilter} onToggle={toggleWatching} onFavorite={toggleFavorite} getStatus={getStatus} onAnimeClick={setSelectedAnime} />}
              {tab === 'movies' && <Movies getStatus={getStatus} onPlan={(anime) => setStatus(anime, 'planejando')} onFavorite={toggleFavorite} onAnimeClick={setSelectedAnime} />}
              {tab === 'discover' && <Discover entries={entries} user={user} getStatus={getStatus} onFavorite={toggleFavorite} onToggle={toggleWatching} onPlan={(anime) => setStatus(anime, 'planejando')} onAnimeClick={setSelectedAnime} />}
              {tab === 'library' && (user ? <Library entries={entries} loading={libraryLoading} onStatusChange={setStatus} onFavorite={toggleFavorite} onRemove={remove} onAnimeClick={setSelectedAnime} /> : <div className="library-empty"><strong>Entre para ver sua lista.</strong><button className="account-login" onClick={() => setAuthOpen(true)}>Entrar</button></div>)}
            </Suspense>
          </div>)}
          {libraryError && <p className="weekly-notice">Não foi possível sincronizar sua lista: {libraryError}</p>}
        </main>
      </div>

      <MobileNav activeTab={activeTab} onSelect={selectTab} />

      {selectedAnime && (
        <Suspense fallback={null}><AnimeModal
          anime={selectedAnime}
          status={getStatus(selectedAnime)}
          onToggle={toggleWatching}
          onPlan={(anime) => setStatus(anime, 'planejando')}
          onFavorite={toggleFavorite}
          onClose={closeModal}
        /></Suspense>
      )}
      {authOpen && <Suspense fallback={null}><AuthModal onClose={() => setAuthOpen(false)} /></Suspense>}
    </div>
  )
}
