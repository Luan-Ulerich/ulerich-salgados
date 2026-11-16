import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { request } from '../api/client.js'
import { formatBRL, maskCentsInput } from '../utils/money.js'

export function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [priceCents, setPriceCents] = useState(0)
  const [priceDisplay, setPriceDisplay] = useState(() => formatBRL(0))
  const [active, setActive] = useState(true)

  const [loadingProduct, setLoadingProduct] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) {
      return
    }

    let cancelled = false

    async function fetchProduct() {
      setLoadingProduct(true)
      setError('')
      setNotFound(false)

      try {
        const products = await request('/products')
        if (cancelled) {
          return
        }

        const found = Array.isArray(products)
          ? products.find((item) => String(item.id) === String(id))
          : null

        if (!found) {
          setNotFound(true)
          return
        }

        setName(found.name)
        setPriceCents(found.priceCents)
        setPriceDisplay(formatBRL(found.priceCents))
        setActive(Boolean(found.active))
      } catch (err) {
        if (cancelled) {
          return
        }
        if (err?.status === 404) {
          setNotFound(true)
        } else if (err instanceof TypeError) {
          setError('Não foi possível conectar ao servidor. Tente de novo.')
        } else {
          setError(err?.data?.message || err?.message || 'Erro ao carregar produto.')
        }
      } finally {
        if (!cancelled) {
          setLoadingProduct(false)
        }
      }
    }

    fetchProduct()

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  function handlePriceChange(event) {
    const masked = maskCentsInput(event.target.value)
    setPriceCents(masked.cents)
    setPriceDisplay(masked.display)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('O nome é obrigatório')
      return
    }
    if (trimmedName.length > 100) {
      setError('O nome deve ter no máximo 100 caracteres')
      return
    }

    setSaving(true)

    try {
      if (isEdit) {
        const payload = {
          name: trimmedName,
          priceCents,
          active,
        }
        await request(`/products/${id}`, {
          method: 'PUT',
          body: payload,
        })
      } else {
        const payload = {
          name: trimmedName,
          priceCents,
          active: true,
        }
        await request('/products', {
          method: 'POST',
          body: payload,
        })
      }

      navigate('/produtos')
    } catch (err) {
      if (err?.status === 404) {
        setNotFound(true)
      } else if (err instanceof TypeError) {
        setError('Não foi possível conectar ao servidor. Tente de novo.')
      } else {
        setError(err?.data?.message || err?.message || 'Erro ao salvar produto.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-container">
      <header className="page-header">
        <Link to="/produtos" className="back-btn" aria-label="Voltar para Produtos">
          ← Voltar
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar produto' : 'Novo produto'}</h1>
      </header>

      {loadingProduct && <p className="products-state">Carregando produto...</p>}

      {!loadingProduct && notFound && (
        <div role="alert" className="products-state-card">
          <p className="products-error-text">Produto não encontrado.</p>
          <Link to="/produtos" className="btn-secondary btn-link">
            Voltar para a lista
          </Link>
        </div>
      )}

      {!loadingProduct && !notFound && (
        <form className="product-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="product-name" className="form-label">
              Nome
            </label>
            <input
              id="product-name"
              name="name"
              type="text"
              className="input-field"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-price" className="form-label">
              Preço
            </label>
            <input
              id="product-price"
              name="price"
              type="text"
              inputMode="numeric"
              className="input-field"
              value={priceDisplay}
              onChange={handlePriceChange}
            />
          </div>

          {isEdit && (
            <label htmlFor="product-active" className="switch-row">
              <span className="form-label">Produto ativo</span>
              <span className="switch-control">
                <input
                  id="product-active"
                  name="active"
                  type="checkbox"
                  className="switch-input"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="form-alert">
              {error}
            </p>
          )}

          <div className="product-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              Salvar
            </button>
            <button
              type="button"
              className="btn-secondary btn-full"
              onClick={() => navigate('/produtos')}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
