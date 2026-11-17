import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../auth/useAuth.js'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/vender" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!email || !password.trim()) {
      setError('Preencha e-mail e senha.')
      return
    }

    setLoading(true)

    try {
      await login(email, password)
      navigate('/vender', { replace: true })
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Não foi possível conectar ao servidor. Tente de novo.')
      } else {
        setError('E-mail ou senha incorretos.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-logo-wrap">
        <img
          src={logo}
          alt="Salgados Ulerich: qualidade e tradição"
          className="login-logo"
        />
      </div>

      <header className="login-header">
        <h1 className="login-title">Bem-vinda</h1>
        <p className="login-subtitle">Entre para registrar suas vendas de hoje.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input-field"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input-field"
            autoComplete="current-password"
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
          disabled={loading}
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
