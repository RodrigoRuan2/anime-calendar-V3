import { useState } from 'react'
import { signInWithPassword, signUpWithPassword } from '../services/authApi'
import { isSupabaseConfigured } from '../services/supabase'
import '../styles/AuthModal.css'

export default function AuthModal({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true); setError('')
    try {
      if (mode === 'register') {
        const data = await signUpWithPassword({ username, email, password })
        setMessage(data.session ? 'Conta criada. Você já está conectado.' : 'Conta criada. Confira seu e-mail para confirmar o cadastro.')
      } else {
        await signInWithPassword({ email, password })
        onClose()
      }
    } catch (cause) { setError(cause.message || 'Não foi possível concluir esta ação.') }
    finally { setLoading(false) }
  }
  return <div className="auth-modal-overlay" onClick={onClose}>
    <section className="auth-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="auth-title">
      <button className="auth-modal__close" onClick={onClose} aria-label="Fechar">×</button>
      <span className="auth-modal__symbol">⛩</span>
      <h2 id="auth-title">{mode === 'register' ? 'Crie sua conta' : 'Bem-vindo de volta'}</h2>
      <p>{mode === 'register' ? 'Sua lista de animes fica privada e sincronizada em todos os seus dispositivos.' : 'Entre para continuar sua jornada no AniCal.'}</p>
      {!isSupabaseConfigured ? <p className="auth-modal__error">O login ainda precisa da chave pública do Supabase para ser ativado.</p> : <form className="auth-modal__form" onSubmit={handleSubmit}>
        {mode === 'register' && <label>Nome de usuário<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ex.: ruan_animes" minLength="3" maxLength="20" required autoComplete="username" /></label>}
        <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" required autoComplete="email" /></label>
        <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" minLength="6" required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
        <button className="auth-modal__submit" disabled={loading}>{loading ? 'Aguarde…' : mode === 'register' ? 'Criar conta' : 'Entrar'}</button>
      </form>}
      {error && <p className="auth-modal__error">{error}</p>}
      {message && <p className="auth-modal__success">{message}</p>}
      <button className="auth-modal__switch" onClick={() => { setMode((value) => value === 'login' ? 'register' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Ainda não tem uma conta? Criar agora' : 'Já possui uma conta? Entrar'}</button>
      <small>Seu e-mail não aparece para outras pessoas. Suas listas são privadas.</small>
    </section>
  </div>
}
