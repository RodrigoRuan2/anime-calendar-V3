const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

export function getMovieReleaseInfo(movie, now = new Date()) {
  const date = movie.episodeDate ? new Date(movie.episodeDate) : null
  if (!date || Number.isNaN(date.getTime()) || (movie.releaseDateOnly && !movie.releaseDayKnown)) {
    return { label: 'Dia a confirmar', phase: 'unknown' }
  }

  const label = date.toLocaleDateString('pt-BR', {
    timeZone: movie.releaseDateOnly ? 'UTC' : BRAZIL_TIMEZONE,
    day: 'numeric', month: 'short', year: 'numeric',
  }).replace('.', '')
  const released = movie.releaseDateOnly
    ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      <= Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    : date.getTime() <= now.getTime()

  return { label, phase: released ? 'released' : 'upcoming' }
}

export function getMovieMonthSummary(movies, now = new Date()) {
  const summary = { released: 0, upcoming: 0, unknown: 0 }
  for (const movie of movies) summary[getMovieReleaseInfo(movie, now).phase] += 1
  return summary
}
