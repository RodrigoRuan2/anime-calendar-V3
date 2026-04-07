import { useState, useEffect } from 'react'
import { getAnimeKey } from '../utils/animeKey'

const STORAGE_KEY = 'anime-calendar-status'

export function useAnimeStatus() {
  const [statusMap, setStatusMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statusMap))
  }, [statusMap])

  function toggleStatus(key, field) {
    const id = getAnimeKey(key)
    if (!id) return

    setStatusMap((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: !prev[id]?.[field],
      },
    }))
  }

  function getStatus(key) {
    const id = getAnimeKey(key)
    return id ? statusMap[id] || { watching: false, favorite: false } : { watching: false, favorite: false }
  }

  // Retorna todos os animes marcados com seus dados
  function getMarkedList(animeList, field) {
    return animeList.filter((anime) => statusMap[getAnimeKey(anime)]?.[field])
  }

  return { toggleStatus, getStatus, statusMap, getMarkedList }
}
