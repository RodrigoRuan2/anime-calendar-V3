const ANILIST_URL = 'https://graphql.anilist.co'

const RECOMMENDATION_QUERY = `
  query ($genre: String, $tag: String, $minimumScore: Int!) {
    Page(page: 1, perPage: 50) {
      media(
        type: ANIME
        format_in: [TV, TV_SHORT, ONA, MOVIE]
        genre: $genre
        tag: $tag
        averageScore_greater: $minimumScore
        sort: [SCORE_DESC, POPULARITY_DESC]
      ) {
        id
        idMal
        title { romaji english native }
        coverImage { large medium }
        description(asHtml: false)
        averageScore
        episodes
        status
        format
        genres
        startDate { year month day }
      }
    }
  }
`

export const RECOMMENDATION_TOPICS = [
  { value: 'all', label: 'Qualquer tema' },
  { value: 'Isekai', label: 'Isekai' },
]

export function recommendationVariables({ genre, topic, score }) {
  const minimumScore = Math.max(0, Math.round(Number(score || 0) * 10) - 1)
  return {
    genre: genre === 'all' ? null : genre,
    tag: topic === 'all' ? null : topic,
    minimumScore,
  }
}

function normalizeRecommendation(media) {
  return {
    id: `anilist:${media.id}`,
    anilistId: media.id,
    malId: media.idMal || null,
    title: media.title?.romaji || media.title?.english || media.title?.native || 'Sem título',
    titleEnglish: media.title?.english || null,
    titleRomaji: media.title?.romaji || null,
    titleNative: media.title?.native || null,
    coverImage: media.coverImage?.large || media.coverImage?.medium || null,
    description: media.description || null,
    score: media.averageScore ? media.averageScore / 10 : null,
    scoreSource: media.averageScore ? 'AniList' : null,
    episodes: media.episodes || null,
    status: media.status || null,
    format: media.format || null,
    genres: media.genres || [],
    startDate: media.startDate?.year ? media.startDate : null,
    streams: [],
  }
}

export async function getAnimeRecommendation(filters, signal) {
  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: RECOMMENDATION_QUERY, variables: recommendationVariables(filters) }),
  })

  if (!response.ok) throw new Error('Não foi possível consultar as recomendações agora.')

  const payload = await response.json()
  if (payload.errors?.length) throw new Error(payload.errors[0].message || 'Não foi possível consultar as recomendações agora.')

  return (payload.data?.Page?.media || []).map(normalizeRecommendation)
}
