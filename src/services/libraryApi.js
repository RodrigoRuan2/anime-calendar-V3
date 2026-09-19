import { supabase } from './supabase'

function animePayload(anime) {
  const anilistId = Number(anime.anilistId || anime.id)
  if (!Number.isInteger(anilistId) || anilistId <= 0) throw new Error('Este anime ainda não possui um identificador compatível para salvar.')
  return {
    anilist_id: anilistId,
    title: anime.title || anime.titleRomaji || anime.titleEnglish || 'Anime sem título',
    cover_image: anime.coverImage || anime.images?.jpg?.large_image_url || null,
    media_type: anime.format || anime.type || null,
    total_episodes: Number.isInteger(anime.episodes) ? anime.episodes : null,
  }
}

export async function fetchLibrary(userId) {
  const { data, error } = await supabase.from('user_anime_library').select('*, user_episode_progress(episode_number, watched_at)').eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertLibraryItem(userId, anime, changes = {}) {
  const payload = { user_id: userId, ...animePayload(anime), ...changes }
  const { data, error } = await supabase.from('user_anime_library').upsert(payload, { onConflict: 'user_id,anilist_id' }).select('*, user_episode_progress(episode_number, watched_at)').single()
  if (error) throw error
  return data
}

export async function updateLibraryItem(id, changes) {
  const { data, error } = await supabase.from('user_anime_library').update(changes).eq('id', id).select('*, user_episode_progress(episode_number, watched_at)').single()
  if (error) throw error
  return data
}

export async function removeLibraryItem(id) {
  const { error } = await supabase.from('user_anime_library').delete().eq('id', id)
  if (error) throw error
}

export async function setEpisodeWatched(userId, libraryId, episodeNumber, watched) {
  if (watched) {
    const { error } = await supabase.from('user_episode_progress').upsert({ user_id: userId, library_id: libraryId, episode_number: episodeNumber }, { onConflict: 'user_id,library_id,episode_number' })
    if (error) throw error
  } else {
    const { error } = await supabase.from('user_episode_progress').delete().eq('library_id', libraryId).eq('episode_number', episodeNumber)
    if (error) throw error
  }
}

export async function markEpisodesThrough(userId, libraryId, lastEpisode) {
  const episodes = Array.from({ length: lastEpisode }, (_, index) => ({
    user_id: userId,
    library_id: libraryId,
    episode_number: index + 1,
  }))
  const { error } = await supabase.from('user_episode_progress').upsert(episodes, { onConflict: 'user_id,library_id,episode_number' })
  if (error) throw error
}
