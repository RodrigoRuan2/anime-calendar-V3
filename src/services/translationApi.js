const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CHUNK_LENGTH = 450

function cacheKey(text) {
  return `anical_translation_${text.slice(0, 120)}`
}

function getCachedTranslation(text) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(text)))
    if (!cached || Date.now() - cached.timestamp > CACHE_TTL_MS) return null
    return cached.translation
  } catch {
    return null
  }
}

function cacheTranslation(text, translation) {
  try {
    sessionStorage.setItem(cacheKey(text), JSON.stringify({ translation, timestamp: Date.now() }))
  } catch {
    // A sinopse original continuará disponível se o armazenamento falhar.
  }
}

function splitText(text) {
  const words = text.split(/\s+/)
  const chunks = []
  let chunk = ''

  for (const word of words) {
    const candidate = chunk ? `${chunk} ${word}` : word
    if (candidate.length > MAX_CHUNK_LENGTH && chunk) {
      chunks.push(chunk)
      chunk = word
    } else {
      chunk = candidate
    }
  }

  if (chunk) chunks.push(chunk)
  return chunks
}

async function translateWithMyMemory(text, signal) {
  const chunks = splitText(text)
  const translations = await Promise.all(chunks.map(async (chunk) => {
    const params = new URLSearchParams({ q: chunk, langpair: 'en|pt-BR' })
    const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal })
    if (!response.ok) throw new Error('O serviço de tradução está indisponível.')

    const data = await response.json()
    if (!data.responseData?.translatedText) throw new Error('A tradução retornou vazia.')
    return data.responseData.translatedText
  }))

  return translations.join(' ')
}

export async function translateSynopsis(text, signal) {
  if (!text) return text

  const cached = getCachedTranslation(text)
  if (cached) return cached

  let translation
  if (SUPABASE_FUNCTION_URL) {
    try {
      const url = SUPABASE_FUNCTION_URL.replace(/\/anime-schedule-proxy(?:\?.*)?$/, '/translate-synopsis')
      const response = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        const data = await response.json()
        translation = data.text
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error
    }
  }

  if (!translation) translation = await translateWithMyMemory(text, signal)
  if (!translation) throw new Error('A tradução retornou vazia.')
  cacheTranslation(text, translation)
  return translation
}
