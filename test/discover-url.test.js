import test from 'node:test'
import assert from 'node:assert/strict'
import { discoverFiltersFromSearch, discoverSearchUrl, EMPTY_DISCOVER_FILTERS } from '../src/utils/discoverUrl.js'

test('link compartilhado restaura filtros e mantém apenas gêneros conhecidos', () => {
  const url = discoverSearchUrl('https://example.com/anime-calendar-V3/?tab=calendar', {
    ...EMPTY_DISCOVER_FILTERS, genres: ['Comedy', 'Fantasy'], score: '8', sort: 'trending', excludeSaved: true,
  })
  const parsed = discoverFiltersFromSearch(new URL(url).search, ['Comedy', 'Fantasy'])
  assert.deepEqual(parsed.genres, ['Comedy', 'Fantasy'])
  assert.equal(parsed.score, '8')
  assert.equal(parsed.sort, 'trending')
  assert.equal(parsed.excludeSaved, true)
  assert.equal(new URL(url).searchParams.get('tab'), 'discover')
})

test('link inválido não aplica filtros desconhecidos', () => {
  assert.equal(discoverFiltersFromSearch('?filters=nope', ['Comedy']), null)
  const search = `?filters=${encodeURIComponent(JSON.stringify({ genres: ['Unknown'], sort: 'popular' }))}`
  assert.deepEqual(discoverFiltersFromSearch(search, ['Comedy']).genres, [])
})
