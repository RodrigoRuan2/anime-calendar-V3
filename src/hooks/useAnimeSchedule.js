import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAggregatedWeeklySchedule } from '../services/animeScheduleApi'
import { getWeekRange, groupScheduleByDay, SCHEDULE_TIMEZONE } from '../utils/weeklySchedule'

export function useAnimeSchedule(weekOffset = 0) {
  const [state, setState] = useState({ key: null, items: [], range: null, loading: true, error: null, partial: false, updatedAt: null, sourceStatus: {}, updating: false, stale: false })
  const [refreshId, setRefreshId] = useState(0)
  const lastRefreshId = useRef(0)
  const [now, setNow] = useState(() => new Date())
  const expectedRange = useMemo(() => getWeekRange(weekOffset, SCHEDULE_TIMEZONE, now), [weekOffset, now])
  const key = expectedRange.startDate

  useEffect(() => {
    const controller = new AbortController()
    const forceRefresh = refreshId > lastRefreshId.current
    lastRefreshId.current = refreshId
    const update = (result) => {
      if (!controller.signal.aborted) setState({ ...result, key, loading: false, error: null })
    }
    getAggregatedWeeklySchedule({ weekOffset, timezone: SCHEDULE_TIMEZONE, forceRefresh, onUpdate: update, signal: controller.signal })
      .then(update)
      .catch((error) => {
        if (!controller.signal.aborted) setState((previous) => ({ ...previous, loading: false, updating: false, partial: Boolean(previous.items.length), stale: Boolean(previous.items.length), error: error.message || 'Não foi possível atualizar o calendário.' }))
      })
    return () => controller.abort()
  }, [weekOffset, refreshId, key])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const visibleState = state.key === key ? state : { key, items: [], range: expectedRange, loading: true, error: null, partial: false, updatedAt: null, sourceStatus: {}, updating: true, stale: false }
  const schedule = useMemo(() => groupScheduleByDay(visibleState.items), [visibleState.items])
  const refresh = useCallback(() => setRefreshId((value) => value + 1), [])
  return { ...visibleState, schedule, now, refresh, timezone: SCHEDULE_TIMEZONE }
}
