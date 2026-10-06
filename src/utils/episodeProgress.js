export function getAiredWeeklyEpisodes(items, now = new Date()) {
  const episodes = new Map()
  for (const anime of items) {
    const episode = Number(anime.episodeNumber)
    const airingAt = anime.airingAt ? new Date(anime.airingAt).getTime() : NaN
    if (!anime.anilistId || !Number.isInteger(episode) || episode < 1 || !Number.isFinite(airingAt) || airingAt > now.getTime()) continue
    const key = String(anime.anilistId)
    if (!episodes.has(key) || episode > episodes.get(key)) episodes.set(key, episode)
  }
  return episodes
}
