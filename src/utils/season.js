export const SEASONS = ['winter', 'spring', 'summer', 'fall']

const SEASON_LABELS = {
  winter: 'Inverno',
  spring: 'Primavera',
  summer: 'Verão',
  fall: 'Outono',
}

export function getSeasonForDate(date = new Date()) {
  const month = date.getMonth() + 1
  const season = month <= 3 ? 'winter' : month <= 6 ? 'spring' : month <= 9 ? 'summer' : 'fall'
  return { year: date.getFullYear(), season }
}

export function shiftSeason({ year, season }, offset) {
  const index = SEASONS.indexOf(season)
  if (index === -1) throw new Error(`Temporada inválida: ${season}`)

  const absoluteIndex = index + offset
  const yearOffset = Math.floor(absoluteIndex / SEASONS.length)
  const normalizedIndex = ((absoluteIndex % SEASONS.length) + SEASONS.length) % SEASONS.length
  return { year: year + yearOffset, season: SEASONS[normalizedIndex] }
}

export function getSeasonLabel({ year, season }) {
  return `${SEASON_LABELS[season] || season} ${year}`
}

export function seasonStartDate({ year, season }) {
  const month = { winter: 0, spring: 3, summer: 6, fall: 9 }[season]
  return new Date(Date.UTC(year, month, 1))
}

export function getReleaseConfirmation(anime, targetSeason) {
  const date = anime.startDate
  if (date?.year && date.month && date.day && anime.schedule?.time) return 'CONFIRMED_DATETIME'
  if (date?.year && date.month && date.day) return 'CONFIRMED_DATE'
  if (date?.year && date.month) return 'CONFIRMED_MONTH'
  if (anime.season === targetSeason.season && anime.seasonYear === targetSeason.year) return 'CONFIRMED_SEASON'
  return 'UNKNOWN'
}

export function getReleaseLabel(anime, targetSeason) {
  const confirmation = anime.releaseConfirmation || getReleaseConfirmation(anime, targetSeason)
  const date = anime.startDate || {}
  const monthName = date.month
    ? new Date(Date.UTC(date.year || targetSeason.year, date.month - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase()
    : null

  if (confirmation === 'CONFIRMED_DATETIME') return `${date.day} ${monthName} • ${anime.schedule.time}`
  if (confirmation === 'CONFIRMED_DATE') return `${date.day} ${monthName}`
  if (confirmation === 'CONFIRMED_MONTH') return `${monthName} ${date.year}`
  if (confirmation === 'CONFIRMED_SEASON') return `${getSeasonLabel(targetSeason).toUpperCase()} • Data a confirmar`
  return 'Data a confirmar'
}
