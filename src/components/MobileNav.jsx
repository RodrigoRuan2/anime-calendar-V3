const ITEMS = [
  { key: 'calendar', label: 'Agenda' },
  { key: 'season', label: 'Temporada' },
  { key: 'movies', label: 'Filmes' },
  { key: 'library', label: 'Minha lista' },
]

function NavIcon({ name }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h3" /></>,
    season: <><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z" /><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z" /></>,
    movies: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M3 12h18M3 8l2-5h16l-2 5M9 3 7 8M16 3l-2 5" /></>,
    library: <><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></>,
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export default function MobileNav({ activeTab, onSelect }) {
  return <nav className="mobile-nav" aria-label="Navegação principal">
    {ITEMS.map(({ key, label }) => <button key={key} type="button" className={`mobile-nav__item ${activeTab === key ? 'mobile-nav__item--active' : ''}`} aria-current={activeTab === key ? 'page' : undefined} onClick={() => onSelect(key)}>
      <NavIcon name={key} />
      <span>{label}</span>
    </button>)}
  </nav>
}
