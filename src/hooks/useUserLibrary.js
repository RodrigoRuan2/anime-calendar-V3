import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLibrary, removeLibraryItem, setEpisodeWatched, updateLibraryItem, upsertLibraryItem } from '../services/libraryApi'
import { getAnimeKey } from '../utils/animeKey'

const EMPTY_STATUS = { watching: false, favorite: false, entry: null, watchedEpisodes: [] }

export function useUserLibrary(user, onSignInRequired) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) { setEntries([]); return }
    setLoading(true)
    try { setEntries(await fetchLibrary(user.id)); setError(null) } catch (cause) { setError(cause.message) } finally { setLoading(false) }
  }, [user])

  useEffect(() => {
    const timer = window.setTimeout(() => { reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const byAnimeId = useMemo(() => new Map(entries.map((entry) => [String(entry.anilist_id), entry])), [entries])
  const entryFor = useCallback((anime) => byAnimeId.get(String(anime?.anilistId || anime?.id || getAnimeKey(anime))), [byAnimeId])
  const getStatus = useCallback((anime) => {
    const entry = entryFor(anime)
    if (!entry) return EMPTY_STATUS
    return { watching: entry.status === 'assistindo', favorite: entry.is_favorite, entry, watchedEpisodes: entry.user_episode_progress?.map((item) => item.episode_number).sort((a, b) => a - b) || [] }
  }, [entryFor])

  const requireUser = useCallback((anime, action) => {
    if (user) return true
    onSignInRequired?.({ anime, action })
    return false
  }, [onSignInRequired, user])
  const replace = useCallback((entry) => setEntries((previous) => {
    const index = previous.findIndex((item) => item.id === entry.id)
    return index < 0 ? [entry, ...previous] : previous.map((item) => item.id === entry.id ? entry : item)
  }), [])

  const toggleWatching = useCallback(async (anime) => {
    if (!requireUser(anime, 'watching')) return
    const entry = entryFor(anime)
    const nextStatus = entry?.status === 'assistindo' ? 'planejando' : 'assistindo'
    try { replace(entry ? await updateLibraryItem(entry.id, { status: nextStatus }) : await upsertLibraryItem(user.id, anime, { status: nextStatus })); setError(null) } catch (cause) { setError(cause.message) }
  }, [entryFor, replace, requireUser, user])

  const toggleFavorite = useCallback(async (anime) => {
    if (!requireUser(anime, 'favorite')) return
    const entry = entryFor(anime)
    try { replace(entry ? await updateLibraryItem(entry.id, { is_favorite: !entry.is_favorite }) : await upsertLibraryItem(user.id, anime, { is_favorite: true })); setError(null) } catch (cause) { setError(cause.message) }
  }, [entryFor, replace, requireUser, user])

  const setStatus = useCallback(async (anime, status) => {
    if (!requireUser(anime, 'status')) return
    const entry = entryFor(anime)
    try { replace(entry ? await updateLibraryItem(entry.id, { status }) : await upsertLibraryItem(user.id, anime, { status })); setError(null) } catch (cause) { setError(cause.message) }
  }, [entryFor, replace, requireUser, user])

  const toggleEpisode = useCallback(async (anime, episodeNumber) => {
    if (!requireUser(anime, { type: 'episode', episodeNumber })) return
    let entry = entryFor(anime)
    try {
      if (!entry) entry = await upsertLibraryItem(user.id, anime, { status: 'assistindo' })
      const watched = entry.user_episode_progress?.some((item) => item.episode_number === episodeNumber)
      await setEpisodeWatched(user.id, entry.id, episodeNumber, !watched)
      await reload()
      setError(null)
    } catch (cause) { setError(cause.message) }
  }, [entryFor, reload, requireUser, user])

  const remove = useCallback(async (entry) => {
    try { await removeLibraryItem(entry.id); setEntries((previous) => previous.filter((item) => item.id !== entry.id)) } catch (cause) { setError(cause.message) }
  }, [])
  return { entries, loading, error, getStatus, entryFor, toggleWatching, toggleFavorite, setStatus, toggleEpisode, remove, reload }
}
