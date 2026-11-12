import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../auth/useAuth.js'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/vender" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate('/vender', { replace: true })
    } catch {
      setError('E-mail ou senha incorretos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-logo-wrap">
        <img src={logo} alt="Salgados Ulerich" className="login-logo" width="210" />
      </div>

      <header className="login-header">
        <h1 className="login-title">Bem-vinda</h1>
        <p className="login-subtitle">Entre para registrar suas vendas de hoje.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p role="alert" className="login-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary login-submit"
          disabled={submitting}
        >
          Entrar
        </button>
      </form>

      <p className="login-PersistentHint">
        Você fica conectada neste celular, sem precisar entrar toda hora.
      </p>
    </main>
  )
}
