export function getAnimeKey(animeOrKey) {
  if (!animeOrKey) return undefined

  if (typeof animeOrKey === 'object') {
    return (
      animeOrKey.mal_id ||
      animeOrKey.route ||
      animeOrKey.title?.toLowerCase().replace(/\s+/g, '-') ||
      animeOrKey.episodeDate ||
      animeOrKey.url
    )
  }

  return String(animeOrKey)
}
