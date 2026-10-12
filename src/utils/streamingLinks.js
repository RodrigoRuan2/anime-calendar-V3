export function safeStreamingUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const raw = value.trim()
  const candidate = raw.startsWith('//') ? `https:${raw}` : /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function getStreamingLinks({ streams = [], externalLinks = [], streamingEpisodes = [] } = {}) {
  const seen = new Set()
  const links = []
  const candidates = [
    ...externalLinks.filter((link) => link?.type === 'STREAMING' && !link.isDisabled).map((link) => ({ name: link.site, url: link.url })),
    ...streams.map((stream) => ({ name: stream.name || stream.platform, url: stream.url })),
    ...streamingEpisodes.map((episode) => ({ name: episode.site, url: episode.url, episode: true })),
  ]

  for (const candidate of candidates) {
    const name = candidate.name?.trim()
    const url = safeStreamingUrl(candidate.url)
    if (!name || !url || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    links.push({ name, url, platform: name.toLowerCase().replace(/[^a-z0-9]+/g, ''), episode: Boolean(candidate.episode) })
  }
  return links
}
