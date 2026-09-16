import { normalizeTitle } from './normalizeAnime.js'

export const SCHEDULE_TIMEZONE = 'America/Sao_Paulo'
export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function zonedParts(date, timezone = SCHEDULE_TIMEZONE) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  return Object.fromEntries(values.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
}

export function zonedDateTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timezone = SCHEDULE_TIMEZONE) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second)
  const actual = zonedParts(new Date(guess), timezone)
  const offset = Date.UTC(year, month - 1, day, hour, minute, second) - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
  return new Date(guess + offset)
}

export function getWeekRange(weekOffset = 0, timezone = SCHEDULE_TIMEZONE, now = new Date()) {
  const local = zonedParts(now, timezone)
  const localMidnight = new Date(Date.UTC(local.year, local.month - 1, local.day))
  const mondayOffset = (localMidnight.getUTCDay() + 6) % 7
  localMidnight.setUTCDate(localMidnight.getUTCDate() - mondayOffset + weekOffset * 7)
  const start = zonedDateTimeToUtc({ year: localMidnight.getUTCFullYear(), month: localMidnight.getUTCMonth() + 1, day: localMidnight.getUTCDate() }, timezone)
  const endDay = new Date(localMidnight)
  endDay.setUTCDate(endDay.getUTCDate() + 7)
  const end = zonedDateTimeToUtc({ year: endDay.getUTCFullYear(), month: endDay.getUTCMonth() + 1, day: endDay.getUTCDate() }, timezone)
  return { start, end, startDate: start.toISOString().slice(0, 10), timezone }
}

export function getLocalScheduleFields(airingAt, timezone = SCHEDULE_TIMEZONE) {
  if (!airingAt) return { localDate: null, localTime: null, weekday: null }
  const date = new Date(airingAt)
  if (Number.isNaN(date.getTime())) return { localDate: null, localTime: null, weekday: null }
  const parts = zonedParts(date, timezone)
  const localDate = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
  const weekday = DAY_KEYS[(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() + 6) % 7]
  return { localDate, localTime: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`, weekday }
}

export function scheduleIdentity(item) {
  return item.anilistId ? `anilist:${item.anilistId}` : item.malId ? `mal:${item.malId}` : `title:${normalizeTitle(item.title)}:ep:${item.episodeNumber || ''}`
}

function scheduleIdentityKeys(item) {
  const episode = item.episodeNumber || ''
  return [
    item.anilistId ? `anilist:${item.anilistId}` : null,
    item.malId ? `mal:${item.malId}` : null,
    ...[item.title, item.titleEnglish, item.titleRomaji, item.titleNative]
      .filter(Boolean)
      .flatMap((title) => {
        const normalized = normalizeTitle(title)
        // "Mukashi Banashi" e "Mukashibanashi" são o mesmo título em
        // fontes diferentes; a chave compacta cobre esse caso específico.
        return [`title:${normalized}:ep:${episode}`, `titlecompact:${normalized.replaceAll(' ', '')}:ep:${episode}`]
      }),
  ].filter(Boolean)
}

export function scheduleConfidence(items) {
  const timed = items.filter((item) => item.airingAt)
  if (!timed.length) return 'estimated'
  const primary = items.find((item) => item.source === 'animeschedule' && !item.timeEstimated)
  if (primary) {
    const disagreement = timed.some((item) => Math.abs(new Date(item.airingAt) - new Date(primary.airingAt)) > 10 * 60 * 1000)
    return disagreement ? 'conflicting' : timed.length > 1 ? 'corroborated' : 'confirmed'
  }
  if (timed.length >= 2) {
    const first = new Date(timed[0].airingAt).getTime()
    return timed.some((item) => Math.abs(new Date(item.airingAt).getTime() - first) > 10 * 60 * 1000) ? 'conflicting' : 'corroborated'
  }
  return timed[0].timeEstimated ? 'estimated' : 'confirmed'
}

export function mergeScheduleSources(sourceLists, timezone = SCHEDULE_TIMEZONE) {
  const groups = []
  const index = new Map()
  sourceLists.flat().forEach((item) => {
    const keys = scheduleIdentityKeys(item)
    const matching = [...new Set(keys.map((key) => index.get(key)).filter((value) => value !== undefined))]
    const groupIndex = matching[0] ?? groups.length
    if (!groups[groupIndex]) groups[groupIndex] = []
    groups[groupIndex].push(item)

    // A AniList normalmente traz romaji + inglês. Ela funciona como ponte
    // entre fontes que entregam apenas um desses títulos e une os grupos.
    matching.slice(1).forEach((otherIndex) => {
      if (otherIndex === groupIndex || !groups[otherIndex]) return
      groups[groupIndex].push(...groups[otherIndex])
      groups[otherIndex] = null
      index.forEach((value, key) => { if (value === otherIndex) index.set(key, groupIndex) })
    })
    keys.forEach((key) => index.set(key, groupIndex))
  })
  const merged = groups.filter(Boolean).map((items) => {
    const ordered = [...items].sort((a, b) => ['animeschedule', 'tsuzuki', 'anilist'].indexOf(a.source) - ['animeschedule', 'tsuzuki', 'anilist'].indexOf(b.source))
    const selected = ordered.find((item) => item.airingAt) || ordered[0]
    const streams = ordered.find((item) => item.streams?.length)?.streams || []
    const platform = ordered.find((item) => item.platform)?.platform || null
    const confidence = scheduleConfidence(items)
    const fields = getLocalScheduleFields(selected.airingAt, timezone)
    const canonicalAniListId = selected.anilistId || ordered.find((item) => item.anilistId)?.anilistId || null
    const canonicalMalId = selected.malId || ordered.find((item) => item.malId)?.malId || null
    return {
      ...selected, anilistId: canonicalAniListId, malId: canonicalMalId, ...fields, id: canonicalAniListId ? `anilist:${canonicalAniListId}` : canonicalMalId ? `mal:${canonicalMalId}` : scheduleIdentity(selected), streams, platform,
      timingConfidence: confidence,
      scheduleSources: items.map((item) => ({ name: item.source, airingAt: item.airingAt, estimated: Boolean(item.timeEstimated) })),
      status: selected.status || 'RELEASING',
    }
  })

  // Última barreira: fontes podem publicar o mesmo episódio com aliases que
  // ainda não estavam associados. Um card só pode ocupar uma vez o mesmo
  // AniList/MAL ou a mesma combinação de pôster + episódio + horário.
  const unique = new Map()
  for (const item of merged) {
    const imageId = String(item.coverImage || '').match(/bx(\d+)-/i)?.[1]
    const timeBucket = item.airingAt ? Math.round(new Date(item.airingAt).getTime() / (10 * 60 * 1000)) : 'unknown'
    const key = item.anilistId ? `anilist:${item.anilistId}:ep:${item.episodeNumber || ''}`
      : item.malId ? `mal:${item.malId}:ep:${item.episodeNumber || ''}`
        : imageId ? `cover:${imageId}:ep:${item.episodeNumber || ''}:at:${timeBucket}`
          : null
    if (!key) {
      unique.set(`fallback:${item.id}`, item)
      continue
    }
    const previous = unique.get(key)
    if (!previous || ['animeschedule', 'tsuzuki', 'anilist'].indexOf(item.source) < ['animeschedule', 'tsuzuki', 'anilist'].indexOf(previous.source)) unique.set(key, item)
  }
  return [...unique.values()].sort((a, b) => (a.airingAt ? new Date(a.airingAt).getTime() : Number.MAX_SAFE_INTEGER) - (b.airingAt ? new Date(b.airingAt).getTime() : Number.MAX_SAFE_INTEGER))
}

export function groupScheduleByDay(items) {
  const grouped = Object.fromEntries(DAY_KEYS.map((day) => [day, []]))
  items.forEach((item) => { if (item.weekday && grouped[item.weekday]) grouped[item.weekday].push(item) })
  return grouped
}

export function getTemporalStatus(item, now = new Date()) {
  if (!item.airingAt) return 'upcoming'
  const minutes = (new Date(item.airingAt).getTime() - now.getTime()) / 60000
  if (minutes > 60) return 'upcoming'
  if (minutes >= -10) return 'soon'
  return 'aired'
}

export function detectScheduleChanges(items) {
  try {
    const key = 'anical:weekly-schedule:last:v1'
    const previous = JSON.parse(localStorage.getItem(key) || '{}')
    const next = {}
    const enriched = items.map((item) => {
      const old = previous[item.id]
      next[item.id] = item.airingAt
      if (!old || !item.airingAt || old === item.airingAt) return item
      const oldFields = getLocalScheduleFields(old)
      return { ...item, previousAiringAt: old, scheduleChanged: true, dateChanged: oldFields.localDate !== item.localDate }
    })
    localStorage.setItem(key, JSON.stringify(next))
    return enriched
  } catch { return items }
}
