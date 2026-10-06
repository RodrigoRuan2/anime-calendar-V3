const GENRE_LABELS = {
  Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama',
  Ecchi: 'Ecchi', Fantasy: 'Fantasia', Horror: 'Terror', MahouShoujo: 'Garotas mágicas',
  Mecha: 'Mecha', Music: 'Música', Mystery: 'Mistério', Psychological: 'Psicológico',
  Romance: 'Romance', 'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Cotidiano',
  Sports: 'Esportes', Supernatural: 'Sobrenatural', Thriller: 'Suspense',
}

export const SCORE_OPTIONS = [
  { value: 'all', label: 'Todas as notas' },
  { value: '9', label: '9,0 ou mais' },
  { value: '8', label: '8,0 ou mais' },
  { value: '7', label: '7,0 ou mais' },
  { value: 'unrated', label: 'Sem nota' },
]

export function genreLabel(genre) {
  return GENRE_LABELS[genre] || genre
}

export function genreOptions(animes) {
  return [...new Set(animes.flatMap((anime) => anime.genres || []))]
    .sort((a, b) => genreLabel(a).localeCompare(genreLabel(b), 'pt-BR'))
}

export function scoreValue(score) {
  const value = Number(score)
  return Number.isFinite(value) && value > 0 && value <= 10 ? value : null
}

export function formatScore(score) {
  const value = scoreValue(score)
  return value === null ? null : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function matchesGenreAndScore(anime, genre, score) {
  if (genre !== 'all' && !anime.genres?.includes(genre)) return false
  const rating = scoreValue(anime.score)
  if (score === 'unrated') return rating === null
  if (score !== 'all') return rating !== null && rating >= Number(score)
  return true
}
