import { useState } from 'react'
import { signOut } from '../services/authApi'
import '../styles/AccountMenu.css'

export default function AccountMenu({ user, onOpenLibrary, onSignIn }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  if (!user) return <button className="account-login" onClick={onSignIn}>Entrar</button>
  const name = user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Minha conta'
  const avatar = user.user_metadata?.avatar_url
  async function handleSignOut() { try { await signOut(); setOpen(false) } catch (cause) { setError(cause.message) } }
  return <div className="account-menu">
    <button className="account-menu__trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
      <b>{name}</b><i>⌄</i>
    </button>
    {open && <div className="account-menu__dropdown"><button onClick={() => { onOpenLibrary(); setOpen(false) }}>☰ Minha lista</button><button onClick={handleSignOut}>Sair</button>{error && <small>{error}</small>}</div>}
  </div>
}
