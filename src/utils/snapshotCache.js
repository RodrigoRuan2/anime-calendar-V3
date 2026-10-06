function stores() {
  const available = []
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      if (globalThis[name]) available.push(globalThis[name])
    } catch { /* storage can be disabled */ }
  }
  return available
}

export function readSnapshot(key, maxAgeMs) {
  let newest = null
  for (const storage of stores()) {
    try {
      const entry = JSON.parse(storage.getItem(key) || 'null')
      const timestamp = Number(entry?.timestamp ?? entry?.ts)
      const age = Date.now() - timestamp
      if (!entry?.data || !Number.isFinite(timestamp) || age < 0 || age > maxAgeMs) continue
      if (!newest || timestamp > newest.timestamp) newest = { data: entry.data, timestamp, age }
    } catch { /* ignore invalid or inaccessible cache */ }
  }
  return newest
}

export function writeSnapshot(key, data) {
  const value = JSON.stringify({ data, timestamp: Date.now() })
  for (const storage of stores()) {
    try { storage.setItem(key, value) } catch { /* cache is optional */ }
  }
}
