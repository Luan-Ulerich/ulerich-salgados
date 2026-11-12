import { useAuth } from '../auth/useAuth.js'

export function VenderPage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Vender</h1>
      <p className="page-description">Registre uma nova venda rapidamente.</p>
    </main>
  )
}

export function VendasPage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Vendas</h1>
      <p className="page-description">Histórico de vendas realizadas.</p>
    </main>
  )
}

export function ResumoPage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Resumo</h1>
      <p className="page-description">Acompanhe o fechamento do dia e do mês.</p>
    </main>
  )
}

export function MaisPage() {
  const { logout } = useAuth()

  return (
    <main className="page-container">
      <h1 className="page-title">Mais</h1>
      <p className="page-description">Opções e configurações da sua conta.</p>
      <div style={{ marginTop: '12px' }}>
        <button type="button" className="btn-secondary" onClick={logout}>
          Sair
        </button>
      </div>
    </main>
  )
}
