import { supabase } from './supabase'

const RETURN_ACTION_KEY = 'anical:pending-library-action'

export function storePendingAction(action) {
  try { sessionStorage.setItem(RETURN_ACTION_KEY, JSON.stringify(action)) } catch { /* optional */ }
}

export function readPendingAction() {
  try {
    const action = JSON.parse(sessionStorage.getItem(RETURN_ACTION_KEY) || 'null')
    sessionStorage.removeItem(RETURN_ACTION_KEY)
    return action
  } catch { return null }
}

function normalizeUsername(username) {
  const normalizedUsername = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    throw new Error('O usuário deve ter de 3 a 20 caracteres: letras, números ou _.')
  }
  return normalizedUsername
}

// Supabase Auth requires an e-mail identifier. This private technical address is
// deterministic and never shown to, or collected from, the AniCal user.
function technicalEmail(username) {
  return `${normalizeUsername(username)}@users.anical.invalid`
}

export async function signInWithPassword({ username, password }) {
  if (!supabase) throw new Error('A conexão com as contas ainda não foi configurada.')
  const { error } = await supabase.auth.signInWithPassword({ email: technicalEmail(username), password })
  if (error) throw error
}

export async function signUpWithPassword({ username, password }) {
  if (!supabase) throw new Error('A conexão com as contas ainda não foi configurada.')
  const normalizedUsername = normalizeUsername(username)
  const { data, error } = await supabase.auth.signUp({
    email: technicalEmail(normalizedUsername),
    password,
    options: { data: { username: normalizedUsername, display_name: username.trim() } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
