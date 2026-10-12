import { useRef, useState } from 'react'
import { genreLabel } from '../utils/animeFilters'
import { getAnimeRecommendation, RECOMMENDATION_TOPICS } from '../services/recommendationApi'
import '../styles/RecommendationPanel.css'

const GENRES = ['all', 'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller']
const SCORES = [
  { value: '9', label: '9,0 ou mais' },
  { value: '8', label: '8,0 ou mais' },
  { value: '7', label: '7,0 ou mais' },
  { value: '6', label: '6,0 ou mais' },
]

export default function RecommendationPanel({ onAnimeClick }) {
  const [topic, setTopic] = useState('Isekai')
  const [genre, setGenre] = useState('Comedy')
  const [score, setScore] = useState('9')
  const [recommendations, setRecommendations] = useState([])
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const shownIds = useRef(new Set())

  const pickRecommendation = (items) => {
    const unseen = items.filter((item) => !shownIds.current.has(item.id))
    const choices = unseen.length ? unseen : items
    if (!unseen.length) shownIds.current.clear()
    const picked = choices[Math.floor(Math.random() * choices.length)] || null
    if (picked) shownIds.current.add(picked.id)
    setRecommendation(picked)
  }

  const recommend = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = { topic, genre, score }
      const items = await getAnimeRecommendation(filters)
      setRecommendations(items)
      shownIds.current.clear()
      pickRecommendation(items)
    } catch (requestError) {
      setRecommendation(null)
      setRecommendations([])
      setError(requestError.message || 'Não foi possível gerar uma recomendação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="recommendation-panel" aria-labelledby="recommendation-title">
      <div className="recommendation-panel__heading">
        <div>
          <p>SEM IDEIA DO QUE VER?</p>
          <h2 id="recommendation-title">Ache seu próximo anime</h2>
        </div>
        <span aria-hidden="true">✦</span>
      </div>

      <div className="recommendation-panel__controls">
        <label>Tema<select value={topic} onChange={(event) => setTopic(event.target.value)}>{RECOMMENDATION_TOPICS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Gênero<select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">Qualquer gênero</option>{GENRES.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{genreLabel(value)}</option>)}</select></label>
        <label>Nota<select value={score} onChange={(event) => setScore(event.target.value)}>{SCORES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button type="button" onClick={recommend} disabled={loading}>{loading ? 'Procurando…' : 'Me recomende'}</button>
      </div>

      {error && <p className="recommendation-panel__message recommendation-panel__message--error">⚠️ {error}</p>}
      {!loading && !error && recommendations.length === 0 && <p className="recommendation-panel__hint">Escolha seus critérios e deixe a gente encontrar uma surpresa.</p>}
      {!loading && !error && recommendations.length > 0 && !recommendation && <p className="recommendation-panel__message">Nenhum anime encontrado com esses critérios. Tente diminuir a nota.</p>}
      {recommendation && (
        <article className="recommendation-card">
          <img src={recommendation.coverImage || 'https://placehold.co/160x230?text=?'} alt="" />
          <div className="recommendation-card__content">
            <p>RECOMENDAÇÃO PARA VOCÊ</p>
            <h3>{recommendation.title}</h3>
            <span>★ {recommendation.score?.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || 'Sem nota'}/10</span>
            <div>{recommendation.genres.slice(0, 3).map((item) => <small key={item}>{genreLabel(item)}</small>)}</div>
            <button type="button" onClick={() => onAnimeClick?.(recommendation)}>Ver detalhes</button>
          </div>
          {recommendations.length > 1 && <button type="button" className="recommendation-card__another" onClick={() => pickRecommendation(recommendations)}>Outra sugestão ↻</button>}
        </article>
      )}
    </section>
  )
}
