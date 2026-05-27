import { useState, useEffect, useRef } from 'react'

const IMAGE_BASE = 'https://img.animeschedule.net/production/assets/public/img/'
const NOTIFIED_KEY = 'anicaltified'
const ENABLED_KEY  = 'anicaltified_enabled'
const WINDOW_MS    = 15 * 60 * 1000

export function useNotifications(watchingAnimes) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(ENABLED_KEY) !== 'false' }
    catch { return true }
  })

  const notifiedRef = useRef(null)
  if (!notifiedRef.current) {
    try { notifiedRef.current = new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')) }
    catch { notifiedRef.current = new Set() }
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      setEnabled(true)
      localStorage.setItem(ENABLED_KEY, 'true')
    }
  }

  function toggleEnabled() {
    setEnabled((prev) => {
      const next = !prev
      localStorage.setItem(ENABLED_KEY, String(next))
      return next
    })
  }

  useEffect(() => {
    if (permission !== 'granted' || !enabled || watchingAnimes.length === 0) return

    const notified = notifiedRef.current

    function check() {
      const now = Date.now()

      for (const anime of watchingAnimes) {
        if (!anime.episodeDate) continue

        const airTime = new Date(anime.episodeDate).getTime()
        const diff    = airTime - now

        if (diff < -60_000 || diff > WINDOW_MS) continue

        const key = `${anime.route || anime.mal_id || anime.title}_${anime.episodeDate}`
        if (notified.has(key)) continue

        notified.add(key)
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified]))

        const imageUrl = anime.imageVersionRoute
          ? `${IMAGE_BASE}${anime.imageVersionRoute}`
          : anime.images?.jpg?.image_url

        const minutesLeft = Math.round(diff / 60000)
        const body = diff <= 0
          ? 'Está começando agora!'
          : minutesLeft <= 1
            ? 'Começa em menos de 1 minuto!'
            : `Começa em ${minutesLeft} minutos`

        new Notification(`🎌 ${anime.title}`, { body, icon: imageUrl, badge: '/favicon.svg', tag: key })
      }
    }

    check()
    const interval = setInterval(check, 60 * 1000)
    return () => clearInterval(interval)
  }, [permission, enabled, watchingAnimes])

  return { permission, enabled, requestPermission, toggleEnabled }
}
