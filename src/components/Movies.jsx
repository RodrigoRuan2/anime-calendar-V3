import { useState } from 'react'
import AnimeCard from './AnimeCard'
import { useMonthlyMovies } from '../hooks/useMonthlyMovies'
import '../styles/Movies.css'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function MovieMonth({ month, movies, getStatus, onToggle, onAnimeClick }) {
  const now = new Date()
  const released = movies.filter((movie) => new Date(movie.episodeDate) < now)
  const upcoming = movies.length - released.length

  return (
    <section className="movie-month">
      <div className="movie-month__header">
        <h2>{MONTHS[month]}</h2>
        <span className="movie-section__count">{movies.length}</span>
      </div>

      {movies.length === 0 ? (
        <p className="movie-section__empty">Nenhum filme com lançamento confirmado.</p>
      ) : (
        <>
          <p className="movie-month__summary">
            {released > 0 && `${released} lançado${released === 1 ? '' : 's'}`}
            {released > 0 && upcoming > 0 && ' · '}
            {upcoming > 0 && `${upcoming} por lançar`}
          </p>
          <div className="day-grid">
            {movies.map((movie) => (
              <AnimeCard
                key={movie.anilistId || movie.route}
                anime={movie}
                status={getStatus(movie)}
                onToggle={onToggle}
                onClick={onAnimeClick}
                aired={new Date(movie.episodeDate) < now}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default function Movies({ getStatus, onToggle, onAnimeClick }) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  return (
    <div className="movies-page">
      <header className="movies-page__intro">
        <span className="movies-page__eyebrow">FILMES DE ANIME</span>
        <h1>Lançamentos de {selectedYear}</h1>
        <p>Veja os filmes de janeiro a dezembro. A agenda indica quando o horário ainda é estimado.</p>
        <div className="movies-page__years" role="tablist" aria-label="Ano dos filmes">
          {[currentYear, currentYear + 1].map((year) => (
            <button
              key={year}
              type="button"
              role="tab"
              aria-selected={selectedYear === year}
              className={selectedYear === year ? 'movies-year-btn movies-year-btn--active' : 'movies-year-btn'}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </header>

      <MovieYear
        key={selectedYear}
        year={selectedYear}
        getStatus={getStatus}
        onToggle={onToggle}
        onAnimeClick={onAnimeClick}
      />
    </div>
  )
}

function MovieYear({ year, getStatus, onToggle, onAnimeClick }) {
  const { months, loading, error } = useMonthlyMovies(year)

  if (loading) {
    return <div className="calendar-status"><div className="loader" /><p>Buscando filmes de {year}...</p></div>
  }

  if (error) {
    return <div className="calendar-status calendar-status--error"><p>⚠️ {error}</p></div>
  }

  return (
    <div className="movies-year-grid">
      {months.map(({ month, movies }) => (
        <MovieMonth
          key={month}
          month={month}
          movies={movies}
          getStatus={getStatus}
          onToggle={onToggle}
          onAnimeClick={onAnimeClick}
        />
      ))}
    </div>
  )
}
