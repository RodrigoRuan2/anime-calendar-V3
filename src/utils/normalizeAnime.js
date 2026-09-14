import { getReleaseConfirmation, seasonStartDate } from './season.js'

const INCLUDED_FORMATS = new Set(['TV', 'TV_SHORT', 'ONA'])

export function normalizeTitle(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cleanDate(date) {
  if (!date?.year) return null
  return { year: date.year, month: date.month || null, day: date.day || null }
}

function getReleaseType(startDate, targetSeason, relations = []) {
  if (startDate?.year && startDate?.month) {
    const startsBeforeSeason = Date.UTC(startDate.year, startDate.month - 1, startDate.day || 1) < seasonStartDate(targetSeason).getTime()
    if (startsBeforeSeason) return 'continuing'
  }
  if (relations.some((relation) => relation === 'PREQUEL' || relation === 'prequel')) return 'sequel'
  return 'new'
}

export function normalizeAniListAnime(media, targetSeason) {
  const title = media.title?.romaji || media.title?.english || media.title?.native || 'Sem título'
  const startDate = cleanDate(media.startDate)
  const relations = media.relations?.edges?.map((edge) => edge.relationType).filter(Boolean) || []
  const anime = {
    id: `anilist:${media.id}`,
    anilistId: media.id,
    malId: media.idMal || null,
    title,
    titleEnglish: media.title?.english || null,
    titleRomaji: media.title?.romaji || null,
    titleNative: media.title?.native || null,
    coverImage: media.coverImage?.large || media.coverImage?.medium || null,
    bannerImage: media.bannerImage || null,
    season: media.season?.toLowerCase() || targetSeason.season,
    seasonYear: media.seasonYear || targetSeason.year,
    format: media.format || null,
    status: media.status || null,
    episodes: media.episodes || null,
    startDate,
    genres: media.genres || [],
    studios: media.studios?.nodes?.map((studio) => studio.name) || [],
    description: media.description || null,
    trailer: media.trailer?.site && media.trailer?.id ? { site: media.trailer.site, id: media.trailer.id } : null,
    source: media.source || null,
    schedule: null,
    streams: [],
    releaseType: getReleaseType(startDate, targetSeason, relations),
  }
  return { ...anime, releaseConfirmation: getReleaseConfirmation(anime, targetSeason) }
}

export function normalizeJikanAnime(anime, targetSeason) {
  const startDate = cleanDate({
    year: anime.aired?.from ? new Date(anime.aired.from).getUTCFullYear() : anime.year,
    month: anime.aired?.from ? new Date(anime.aired.from).getUTCMonth() + 1 : null,
    day: anime.aired?.from ? new Date(anime.aired.from).getUTCDate() : null,
  })
  const normalized = {
    id: `mal:${anime.mal_id}`,
    anilistId: null,
    malId: anime.mal_id,
    title: anime.title || anime.title_english || anime.title_japanese || 'Sem título',
    titleEnglish: anime.title_english || null,
    titleRomaji: anime.title || null,
    titleNative: anime.title_japanese || null,
    coverImage: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
    bannerImage: null,
    season: anime.season || targetSeason.season,
    seasonYear: anime.year || targetSeason.year,
    format: anime.type === 'TV Special' ? 'SPECIAL' : anime.type?.replace(' ', '_').toUpperCase() || null,
    status: anime.status || null,
    episodes: anime.episodes || null,
    startDate,
    genres: [...(anime.genres || []), ...(anime.explicit_genres || [])].map((genre) => genre.name),
    studios: (anime.studios || []).map((studio) => studio.name),
    description: anime.synopsis || null,
    trailer: anime.trailer?.embed_url ? { url: anime.trailer.embed_url } : null,
    source: anime.source || null,
    schedule: null,
    streams: [],
    score: anime.score || null,
    releaseType: getReleaseType(startDate, targetSeason),
  }
  return { ...normalized, releaseConfirmation: getReleaseConfirmation(normalized, targetSeason) }
}

export function isSeasonFormatIncluded(anime) {
  return INCLUDED_FORMATS.has(anime.format)
}

function identityKeys(anime) {
  return [
    anime.anilistId ? `anilist:${anime.anilistId}` : null,
    anime.malId ? `mal:${anime.malId}` : null,
    anime.title ? `title:${normalizeTitle(anime.title)}:${anime.seasonYear || ''}:${anime.season || ''}` : null,
  ].filter(Boolean)
}

export function mergeAnimeCatalogs(animeLists, targetSeason) {
  const merged = []
  const indexes = new Map()

  for (const anime of animeLists.flat()) {
    if (!isSeasonFormatIncluded(anime)) continue
    const matches = identityKeys(anime).map((key) => indexes.get(key)).find((index) => index !== undefined)

    if (matches === undefined) {
      const item = { ...anime }
      const index = merged.push(item) - 1
      identityKeys(item).forEach((key) => indexes.set(key, index))
      continue
    }

    const existing = merged[matches]
    // AniList é a fonte principal do catálogo; Jikan preenche lacunas e MAL.
    const combined = {
      ...anime,
      ...existing,
      anilistId: existing.anilistId || anime.anilistId,
      malId: existing.malId || anime.malId,
      coverImage: existing.coverImage || anime.coverImage,
      bannerImage: existing.bannerImage || anime.bannerImage,
      description: existing.description || anime.description,
      trailer: existing.trailer || anime.trailer,
      score: existing.score || anime.score,
      genres: existing.genres?.length ? existing.genres : anime.genres,
      studios: existing.studios?.length ? existing.studios : anime.studios,
      id: existing.anilistId ? `anilist:${existing.anilistId}` : `mal:${existing.malId || anime.malId}`,
    }
    combined.releaseConfirmation = getReleaseConfirmation(combined, targetSeason)
    merged[matches] = combined
    identityKeys(combined).forEach((key) => indexes.set(key, matches))
  }

  return merged.sort((a, b) => normalizeTitle(a.title).localeCompare(normalizeTitle(b.title)))
}

export function enrichWithSchedule(catalog, schedule = [], targetSeason) {
  const scheduleByTitle = new Map(schedule.map((item) => [normalizeTitle(item.title || item.romaji || item.english), item]))
  return catalog.map((anime) => {
    const entry = [anime.title, anime.titleRomaji, anime.titleEnglish]
      .map(normalizeTitle)
      .map((title) => scheduleByTitle.get(title))
      .find(Boolean)
    if (!entry) return anime

    const date = entry.episodeDate ? new Date(entry.episodeDate) : null
    const scheduleData = date ? {
      date: entry.episodeDate,
      weekday: date.getDay(),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timezone: 'America/Sao_Paulo',
      episodeNumber: entry.episodeNumber || null,
    } : null
    const enriched = { ...anime, schedule: scheduleData, streams: entry.streams || anime.streams }
    return { ...enriched, releaseConfirmation: getReleaseConfirmation(enriched, targetSeason) }
  })
}
