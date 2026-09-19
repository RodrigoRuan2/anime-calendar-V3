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

export async function signInWithPassword({ email, password }) {
  if (!supabase) throw new Error('A conexão com as contas ainda não foi configurada.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithPassword({ username, email, password }) {
  if (!supabase) throw new Error('A conexão com as contas ainda não foi configurada.')
  const normalizedUsername = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) throw new Error('O usuário deve ter de 3 a 20 caracteres: letras, números ou _.')
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo, data: { username: normalizedUsername, display_name: username.trim() } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
