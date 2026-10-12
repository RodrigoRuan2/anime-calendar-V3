import test from 'node:test'
import assert from 'node:assert/strict'
import { getStreamingLinks, safeStreamingUrl } from '../src/utils/streamingLinks.js'

test('mostra apenas links de streaming ativos e seguros', () => {
  const links = getStreamingLinks({ externalLinks: [
    { site: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/123', type: 'STREAMING', isDisabled: false },
    { site: 'Site oficial', url: 'https://example.com', type: 'INFO', isDisabled: false },
    { site: 'Netflix', url: 'https://netflix.com/title/123', type: 'STREAMING', isDisabled: true },
    { site: 'Outro', url: 'javascript:alert(1)', type: 'STREAMING', isDisabled: false },
  ] })
  assert.deepEqual(links, [{ name: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/123', platform: 'crunchyroll', episode: false }])
  assert.equal(safeStreamingUrl('www.netflix.com/title/123'), 'https://www.netflix.com/title/123')
  assert.equal(safeStreamingUrl('javascript:alert(1)'), null)
})

test('usa um episódio como alternativa, sem duplicar plataforma', () => {
  const links = getStreamingLinks({
    externalLinks: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/series/123', type: 'STREAMING' }],
    streams: [{ name: 'Crunchyroll', url: 'crunchyroll.com/watch/123' }],
    streamingEpisodes: [
      { site: 'Crunchyroll', url: 'https://crunchyroll.com/watch/123' },
      { site: 'HIDIVE', url: 'https://www.hidive.com/video/123' },
    ],
  })
  assert.equal(links.length, 2)
  assert.equal(links[0].episode, false)
  assert.equal(links[1].episode, true)
})
