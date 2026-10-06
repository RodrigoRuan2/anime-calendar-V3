export function getMyWeekSummary(items, getStatus, now = new Date()) {
  const followed = items.filter((anime) => getStatus(anime).watching)
    .sort((a, b) => (a.airingAt ? new Date(a.airingAt).getTime() : Infinity) - (b.airingAt ? new Date(b.airingAt).getTime() : Infinity))
  const pending = followed.filter((anime) => {
    const episode = Number(anime.episodeNumber)
    return anime.airingAt && new Date(anime.airingAt).getTime() <= now.getTime()
      && Number.isInteger(episode) && !getStatus(anime).watchedEpisodes.includes(episode)
  })
  const next = followed.find((anime) => anime.airingAt && new Date(anime.airingAt).getTime() >= now.getTime() - 10 * 60 * 1000) || null
  return { followed, pendingCount: pending.length, next }
}
