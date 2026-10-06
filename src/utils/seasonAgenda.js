import { seasonStartDate, shiftSeason } from './season.js'

function monthKey(date) {
  return `${date.year}-${String(date.month).padStart(2, '0')}`
}

export function seasonAgendaDate(anime, targetSeason) {
  const date = anime.startDate
  const start = seasonStartDate(targetSeason).getTime()
  const end = seasonStartDate(shiftSeason(targetSeason, 1)).getTime()
  const month = date?.year && date.month ? Date.UTC(date.year, date.month - 1, 1) : null
  if (month !== null && month >= start && month < end) {
    if (date.day && date.day >= 1 && date.day <= new Date(Date.UTC(date.year, date.month, 0)).getUTCDate()) {
      const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day))
        .toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })
        .replace('.', '').toUpperCase()
      return { kind: 'day', monthKey: monthKey(date), day: date.day, weekday }
    }
    return { kind: 'month', monthKey: monthKey(date) }
  }
  return { kind: anime.releaseType === 'continuing' ? 'airing' : 'unknown' }
}

export function groupSeasonAgenda(animes, targetSeason) {
  const months = new Map()
  const airing = []
  const unknown = []
  for (const anime of animes) {
    const date = seasonAgendaDate(anime, targetSeason)
    if (date.kind === 'airing') airing.push(anime)
    else if (date.kind === 'unknown') unknown.push(anime)
    else {
      if (!months.has(date.monthKey)) months.set(date.monthKey, [])
      months.get(date.monthKey).push(anime)
    }
  }
  const byTitle = (a, b) => a.title.localeCompare(b.title, 'pt-BR')
  const groups = []
  for (const [key, entries] of [...months].sort(([a], [b]) => a.localeCompare(b))) {
    entries.sort((a, b) => (a.startDate.day || Infinity) - (b.startDate.day || Infinity) || byTitle(a, b))
    const [year, month] = key.split('-').map(Number)
    const title = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    groups.push({ key, title, subtitle: `${entries.length} ${entries.length === 1 ? 'anime' : 'animes'}`, animes: entries })
  }
  if (airing.length) groups.push({ key: 'airing', title: 'Em exibição', subtitle: 'Continuações que já começaram', animes: airing.sort(byTitle) })
  if (unknown.length) groups.push({ key: 'unknown', title: 'Data a confirmar', subtitle: 'Sem mês de estreia definido', animes: unknown.sort(byTitle) })
  return groups
}
