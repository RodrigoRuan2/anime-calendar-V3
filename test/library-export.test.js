import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLibraryCsv } from '../src/utils/libraryExport.js'

test('exportação CSV protege títulos com fórmulas, separadores e aspas', () => {
  const csv = buildLibraryCsv([{ anilist_id: 1, title: '=HYPERLINK("x;y")', status: 'planejando', is_favorite: true, total_episodes: 12 }])
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"\'=HYPERLINK(""x;y"")"'))
  assert.ok(csv.includes('"Sim"'))
})
