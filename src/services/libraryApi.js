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
  const { data, error } = await supabase.from('user_anime_library').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertLibraryItem(userId, anime, changes = {}) {
  const payload = { user_id: userId, ...animePayload(anime), ...changes }
  const { data, error } = await supabase.from('user_anime_library').upsert(payload, { onConflict: 'user_id,anilist_id' }).select('*').single()
  if (error) throw error
  return data
}

export async function updateLibraryItem(id, changes) {
  const { data, error } = await supabase.from('user_anime_library').update(changes).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function removeLibraryItem(id) {
  const { error } = await supabase.from('user_anime_library').delete().eq('id', id)
  if (error) throw error
}
