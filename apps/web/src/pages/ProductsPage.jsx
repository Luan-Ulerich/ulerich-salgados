import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/client.js'
import { formatBRL } from '../utils/money.js'

export function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      try {
        const data = await request('/products')
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof TypeError) {
            setError('Não foi possível conectar ao servidor. Tente de novo.')
          } else {
            setError(err?.data?.message || err?.message || 'Não foi possível carregar os produtos.')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [reloadCount])

  function handleRetry() {
    setLoading(true)
    setError('')
    setReloadCount((count) => count + 1)
  }

  return (
    <main className="page-container products-page">
      <header className="page-header">
        <Link to="/mais" className="back-btn" aria-label="Voltar para Mais">
          ← Voltar
        </Link>
        <h1 className="page-title">Produtos</h1>
      </header>

      {loading && <p className="products-state">Carregando produtos...</p>}

      {!loading && error && (
        <div role="alert" className="products-state-card">
          <p className="products-error-text">{error}</p>
          <button type="button" className="btn-secondary" onClick={handleRetry}>
            Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="products-state">Nenhum produto ainda. Cadastre o primeiro.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="products-list">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/produtos/${product.id}`}
              className={`product-card${product.active ? '' : ' product-card-inactive'}`}
            >
              <div className="product-card-info">
                <span className="product-card-name">{product.name}</span>
                <span className="product-card-price">
                  {product.priceCents === 0
                    ? 'Preço a definir'
                    : formatBRL(product.priceCents)}
                </span>
              </div>

              {!product.active && <span className="product-badge-inactive">Inativo</span>}
            </Link>
          ))}
        </div>
      )}

      <div className="products-bottom-bar">
        <div className="products-bottom-bar-inner">
          <Link to="/produtos/novo" className="btn-primary btn-link">
            Novo produto
          </Link>
        </div>
      </div>
    </main>
  )
}
