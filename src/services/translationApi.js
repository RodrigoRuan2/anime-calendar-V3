const SUPABASE_FUNCTION_URL = import.meta.env?.VITE_SUPABASE_FUNCTION_URL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CHUNK_LENGTH = 450

export function cleanSynopsis(text) {
  return String(text || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<br\s*\/?>(\r?\n)?/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (entity, code) => Number(code) <= 0x10ffff ? String.fromCodePoint(Number(code)) : entity)
    .replace(/\s+/g, ' ')
    .trim()
}

export function getSynopsisPreview(text, maxLength = 430) {
  const cleaned = cleanSynopsis(text)
  if (cleaned.length <= maxLength) return cleaned

  const boundary = Math.max(cleaned.lastIndexOf('. ', maxLength), cleaned.lastIndexOf('! ', maxLength), cleaned.lastIndexOf('? ', maxLength))
  return `${cleaned.slice(0, boundary > 160 ? boundary + 1 : maxLength).trim()}…`
}

function cacheKey(text) {
  return `anical_translation_v2_${text.slice(0, 120)}`
}

export function usableTranslation(original, translated) {
  const cleaned = cleanSynopsis(translated)
  if (!cleaned || /^(mymemory warning|translation failed|quota exceeded|please select two distinct languages)/i.test(cleaned)) return null
  const englishWords = original.match(/\b(the|and|with|from|this|that|their|about|after|before|story|part|world|season)\b/gi) || []
  if (cleaned.toLowerCase() === original.toLowerCase() && original.length >= 35 && englishWords.length >= 2) return null
  return cleaned
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
    if (data.responseStatus && Number(data.responseStatus) !== 200) throw new Error('O serviço de tradução recusou o texto.')
    return data.responseData.translatedText
  }))

  return translations.join(' ')
}

export async function translateSynopsis(text, signal) {
  const cleanedText = cleanSynopsis(text)
  if (!cleanedText) return cleanedText

  const cached = getCachedTranslation(cleanedText)
  if (cached) return cached

  let translation
  if (SUPABASE_FUNCTION_URL) {
    try {
      const url = SUPABASE_FUNCTION_URL.replace(/\/anime-schedule-proxy(?:\?.*)?$/, '/translate-synopsis')
      const response = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedText }),
      })

      if (response.ok) {
        const data = await response.json()
        translation = data.text
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error
    }
  }

  let usable = usableTranslation(cleanedText, translation)
  if (!usable) usable = usableTranslation(cleanedText, await translateWithMyMemory(cleanedText, signal))
  if (!usable) throw new Error('A tradução em português não está disponível.')
  cacheTranslation(cleanedText, usable)
  return usable
}
