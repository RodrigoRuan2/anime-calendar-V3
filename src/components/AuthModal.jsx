import { useState } from 'react'
import { signInWithPassword, signUpWithPassword } from '../services/authApi'
import { isSupabaseConfigured } from '../services/supabase'
import '../styles/AuthModal.css'

export default function AuthModal({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true); setError('')
    try {
      if (mode === 'register') {
        const data = await signUpWithPassword({ username, password })
        setMessage(data.session ? 'Conta criada. Você já está conectado.' : 'Conta criada. Agora você já pode entrar com seu usuário e senha.')
      } else {
        await signInWithPassword({ username, password })
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
      <p>{mode === 'register' ? 'Escolha seu usuário e senha. Sua lista fica privada e sincronizada em todos os seus dispositivos.' : 'Entre com seu usuário e senha para continuar sua jornada no AniCal.'}</p>
      {!isSupabaseConfigured ? <p className="auth-modal__error">O login ainda precisa da chave pública do Supabase para ser ativado.</p> : <form className="auth-modal__form" onSubmit={handleSubmit}>
        <label>Nome de usuário<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ex.: ruan_animes" minLength="3" maxLength="20" required autoComplete="username" /></label>
        <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" minLength="6" required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
        <button className="auth-modal__submit" disabled={loading}>{loading ? 'Aguarde…' : mode === 'register' ? 'Criar conta' : 'Entrar'}</button>
      </form>}
      {error && <p className="auth-modal__error">{error}</p>}
      {message && <p className="auth-modal__success">{message}</p>}
      <button className="auth-modal__switch" onClick={() => { setMode((value) => value === 'login' ? 'register' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Ainda não tem uma conta? Criar agora' : 'Já possui uma conta? Entrar'}</button>
      <small>Não pedimos e-mail. Guarde sua senha: por enquanto não há recuperação de acesso.</small>
    </section>
  </div>
}
