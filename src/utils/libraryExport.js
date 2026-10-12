const COLUMNS = [
  ['anilist_id', 'ID AniList'], ['title', 'Anime'], ['status', 'Situação'],
  ['is_favorite', 'Favorito'], ['total_episodes', 'Episódios'], ['updated_at', 'Atualizado em'],
]

function csvCell(value) {
  let text = value == null ? '' : String(value)
  // Títulos externos não devem virar fórmulas ao abrir o CSV em uma planilha.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function buildLibraryCsv(entries) {
  const lines = [COLUMNS.map(([, label]) => csvCell(label)).join(';')]
  for (const entry of entries) {
    lines.push(COLUMNS.map(([key]) => csvCell(key === 'is_favorite' ? entry[key] ? 'Sim' : 'Não' : entry[key])).join(';'))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
