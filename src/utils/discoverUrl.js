export const EMPTY_DISCOVER_FILTERS = {
  genres: [], excludedGenres: [], genreMode: 'all',
  topic: 'all', topicStrength: 'strong', score: '0',
  format: 'all', status: 'all', release: 'all',
  yearStart: '', yearEnd: '', maxEpisodes: '0', maxMinutes: '0',
  season: 'all', source: 'all', platform: 'all', sort: 'score',
  excludeSaved: false, excludeCompleted: false, avoidUnstartedSequels: false,
}

export function discoverFiltersFromSearch(search, allowedGenres) {
  const raw = new URLSearchParams(search).get('filters')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const filters = { ...EMPTY_DISCOVER_FILTERS }
    for (const [key, fallback] of Object.entries(EMPTY_DISCOVER_FILTERS)) {
      const value = parsed[key]
      if (Array.isArray(fallback)) {
        filters[key] = Array.isArray(value) ? value.filter((genre) => allowedGenres.includes(genre)) : []
      } else if (typeof fallback === 'boolean') {
        filters[key] = typeof value === 'boolean' ? value : fallback
      } else {
        filters[key] = typeof value === 'string' && value.length < 80 ? value : fallback
      }
    }
    return filters
  } catch {
    return null
  }
}

export function discoverSearchUrl(url, filters) {
  const next = new URL(url)
  next.searchParams.set('tab', 'discover')
  const changes = Object.fromEntries(Object.entries(filters).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(EMPTY_DISCOVER_FILTERS[key])))
  next.searchParams.set('filters', JSON.stringify(changes))
  return next.toString()
}
