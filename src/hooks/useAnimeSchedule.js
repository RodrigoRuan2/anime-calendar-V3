import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAggregatedWeeklySchedule } from '../services/animeScheduleApi'
import { groupScheduleByDay, SCHEDULE_TIMEZONE } from '../utils/weeklySchedule'

export function useAnimeSchedule(weekOffset = 0) {
  const [state, setState] = useState({ items: [], range: null, loading: true, error: null, partial: false, updatedAt: null, sourceStatus: {} })
  const [refreshId, setRefreshId] = useState(0)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const controller = new AbortController()
    getAggregatedWeeklySchedule({ weekOffset, timezone: SCHEDULE_TIMEZONE, forceRefresh: refreshId > 0 })
      .then((result) => { if (!controller.signal.aborted) setState({ ...result, loading: false, error: null }) })
      .catch((error) => { if (!controller.signal.aborted) setState((previous) => ({ ...previous, loading: false, error: error.message || 'Não foi possível atualizar o calendário.' })) })
    return () => controller.abort()
  }, [weekOffset, refreshId])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const schedule = useMemo(() => groupScheduleByDay(state.items), [state.items])
  const refresh = useCallback(() => setRefreshId((value) => value + 1), [])
  return { ...state, schedule, now, refresh, timezone: SCHEDULE_TIMEZONE }
}
