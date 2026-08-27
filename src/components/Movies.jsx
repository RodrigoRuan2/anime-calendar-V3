import AnimeCard from './AnimeCard'
import { useMonthlyMovies } from '../hooks/useMonthlyMovies'
import '../styles/Movies.css'

function MovieSection({ title, subtitle, movies, getStatus, onToggle, onAnimeClick }) {
  return (
    <section className="movie-section">
      <div className="movie-section__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="movie-section__count">{movies.length}</span>
      </div>

      {movies.length === 0 ? (
        <p className="movie-section__empty">Nenhum filme listado para este período.</p>
      ) : (
        <div className="day-grid">
          {movies.map((movie) => (
            <AnimeCard
              key={movie.anilistId || movie.route}
              anime={movie}
              status={getStatus(movie)}
              onToggle={onToggle}
              onClick={onAnimeClick}
              aired={new Date(movie.episodeDate) < new Date()}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function Movies({ getStatus, onToggle, onAnimeClick }) {
  const { movies, loading, error } = useMonthlyMovies()
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const now = new Date()
  const released = movies.filter((movie) => new Date(movie.episodeDate) < now)
  const upcoming = movies.filter((movie) => new Date(movie.episodeDate) >= now)

  if (loading) {
    return <div className="calendar-status"><div className="loader" /><p>Buscando filmes de {monthName}...</p></div>
  }

  if (error) {
    return <div className="calendar-status calendar-status--error"><p>⚠️ {error}</p></div>
  }

  return (
    <div className="movies-page">
      <header className="movies-page__intro">
        <span className="movies-page__eyebrow">FILMES DE ANIME</span>
        <h1>{monthName}</h1>
        <p>Filmes ficam separados dos episódios semanais. Os horários usam a agenda da Tsuzuki/AniList.</p>
      </header>

      <MovieSection
        title="Próximos lançamentos"
        subtitle="Ainda chegam neste mês"
        movies={upcoming}
        getStatus={getStatus}
        onToggle={onToggle}
        onAnimeClick={onAnimeClick}
      />
      <MovieSection
        title="Já lançados"
        subtitle="Lançados neste mês"
        movies={released}
        getStatus={getStatus}
        onToggle={onToggle}
        onAnimeClick={onAnimeClick}
      />
    </div>
  )
}
