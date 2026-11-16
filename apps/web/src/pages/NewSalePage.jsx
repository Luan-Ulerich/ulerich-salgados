import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/client.js'
import { formatBRL, maskCentsInput } from '../utils/money.js'
import { buildSalePayload, orderTotal } from '../utils/sale.js'

const PAYMENT_OPTIONS = [
  {
    value: 'DINHEIRO',
    label: 'Dinheiro',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    value: 'PIX',
    label: 'Pix',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3l9 9-9 9-9-9 9-9z" />
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
      </svg>
    ),
  },
  {
    value: 'CARTAO',
    label: 'Cartão',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="15" x2="10" y2="15" />
      </svg>
    ),
  },
]

function formatTodayPtBR() {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
}

export function NewSalePage() {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  const [todayTotalCents, setTodayTotalCents] = useState(null)

  const [mode, setMode] = useState('items')
  const [quantities, setQuantities] = useState({})
  const [avulsoCents, setAvulsoCents] = useState(0)
  const [avulsoDisplay, setAvulsoDisplay] = useState(() => formatBRL(0))

  const [paymentMethod, setPaymentMethod] = useState('')
  const [pending, setPending] = useState(false)
  const [customerName, setCustomerName] = useState('')

  const [zeroPriceNotice, setZeroPriceNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [savedNotice, setSavedNotice] = useState('')

  const submittingRef = useRef(false)
  const savedNoticeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) {
        clearTimeout(savedNoticeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      try {
        const data = await request('/products?active=true')
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof TypeError) {
            setProductsError('Não foi possível conectar ao servidor. Tente de novo.')
          } else {
            setProductsError(
              err?.data?.message || err?.message || 'Não foi possível carregar os produtos.'
            )
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [reloadCount])

  useEffect(() => {
    let cancelled = false

    async function fetchTodaySummary() {
      try {
        const summary = await request('/summary/day')
        if (!cancelled && summary && Number.isInteger(summary.totalCents)) {
          setTodayTotalCents(summary.totalCents)
        }
      } catch {
        if (!cancelled) {
          setTodayTotalCents(null)
        }
      }
    }

    fetchTodaySummary()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshTodaySummary() {
    try {
      const summary = await request('/summary/day')
      if (summary && Number.isInteger(summary.totalCents)) {
        setTodayTotalCents(summary.totalCents)
      }
    } catch {
      setTodayTotalCents(null)
    }
  }

  function handleRetryProducts() {
    setLoadingProducts(true)
    setProductsError('')
    setReloadCount((count) => count + 1)
  }

  function handleProductTap(product) {
    if (product.priceCents === 0) {
      setZeroPriceNotice('Defina o preço em Mais → Produtos.')
      return
    }

    setZeroPriceNotice('')
    setSubmitError('')
    setQuantities((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }))
  }

  function handleIncreaseQuantity(productId) {
    setSubmitError('')
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }))
  }

  function handleDecreaseQuantity(productId) {
    setSubmitError('')
    setQuantities((prev) => {
      const current = prev[productId] || 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return {
        ...prev,
        [productId]: current - 1,
      }
    })
  }

  function handleToggleAvulso() {
    setZeroPriceNotice('')
    setSubmitError('')
    if (mode === 'items') {
      setMode('avulso')
      setQuantities({})
    } else {
      setMode('items')
      setAvulsoCents(0)
      setAvulsoDisplay(formatBRL(0))
    }
  }

  function handleAvulsoChange(event) {
    setSubmitError('')
    const masked = maskCentsInput(event.target.value)
    setAvulsoCents(masked.cents)
    setAvulsoDisplay(masked.display)
  }

  const lines = products
    .filter((product) => (quantities[product.id] || 0) > 0)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity: quantities[product.id],
    }))

  const itemsTotalCents = orderTotal(lines)
  const currentTotalCents = mode === 'avulso' ? avulsoCents : itemsTotalCents
  const trimmedCustomerName = customerName.trim()

  const missingAmount =
    mode === 'avulso' ? avulsoCents <= 0 : lines.length === 0 || itemsTotalCents <= 0
  const missingPaymentMethod = !paymentMethod
  const missingCustomerForPending = pending && trimmedCustomerName.length === 0

  let disabledReason = ''
  if (saving) {
    disabledReason = 'Salvando venda...'
  } else if (missingAmount) {
    disabledReason =
      mode === 'avulso'
        ? 'Informe um valor maior que R$ 0,00.'
        : 'Adicione pelo menos 1 produto ao pedido.'
  } else if (missingPaymentMethod) {
    disabledReason = 'Escolha a forma de pagamento.'
  } else if (missingCustomerForPending) {
    disabledReason = 'Informe o nome de quem comprou para venda fiado.'
  }

  const isSubmitDisabled =
    saving || missingAmount || missingPaymentMethod || missingCustomerForPending

  async function handleSaveSale() {
    if (isSubmitDisabled || submittingRef.current) {
      return
    }

    submittingRef.current = true
    setSaving(true)
    setSubmitError('')
    setSavedNotice('')

    try {
      const payload = buildSalePayload({
        mode,
        lines,
        avulsoCents,
        paymentMethod,
        pending,
        customerName,
      })

      const createdSale = await request('/sales', {
        method: 'POST',
        body: payload,
      })

      const savedCents = Number.isInteger(createdSale?.totalCents)
        ? createdSale.totalCents
        : currentTotalCents

      setQuantities({})
      setAvulsoCents(0)
      setAvulsoDisplay(formatBRL(0))
      setCustomerName('')
      setPaymentMethod('')
      setPending(false)
      setZeroPriceNotice('')

      setSavedNotice(`Venda salva · ${formatBRL(savedCents)}`)
      if (savedNoticeTimerRef.current) {
        clearTimeout(savedNoticeTimerRef.current)
      }
      savedNoticeTimerRef.current = setTimeout(() => {
        setSavedNotice('')
      }, 4000)

      await refreshTodaySummary()
    } catch (err) {
      if (err instanceof TypeError) {
        setSubmitError('Não foi possível conectar ao servidor. Tente de novo.')
      } else {
        setSubmitError(err?.data?.message || err?.message || 'Erro ao salvar venda.')
      }
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  return (
    <main className="page-container sale-page">
      <header className="sale-header">
        <div className="sale-header-left">
          <h1 className="sale-title">Nova venda</h1>
          <p className="sale-date">{formatTodayPtBR()}</p>
        </div>

        {todayTotalCents !== null && (
          <div className="sale-today-box">
            <span className="sale-today-label">Recebido hoje</span>
            <span className="sale-today-value money">{formatBRL(todayTotalCents)}</span>
          </div>
        )}
      </header>

      {savedNotice && (
        <div role="status" className="sale-status-banner">
          {savedNotice}
        </div>
      )}

      {mode === 'items' ? (
        <section aria-label="Produtos ativos" className="sale-section">
          {loadingProducts && <p className="products-state">Carregando produtos...</p>}

          {!loadingProducts && productsError && (
            <div role="alert" className="products-state-card">
              <p className="products-error-text">{productsError}</p>
              <button type="button" className="btn-secondary" onClick={handleRetryProducts}>
                Tentar de novo
              </button>
            </div>
          )}

          {!loadingProducts && !productsError && products.length === 0 && (
            <div className="products-state-card">
              <p className="products-state">
                Nenhum produto ativo. Cadastre em{' '}
                <Link to="/produtos" className="sale-inline-link">
                  Mais → Produtos.
                </Link>
              </p>
            </div>
          )}

          {!loadingProducts && !productsError && products.length > 0 && (
            <>
              <div className="sale-products-grid">
                {products.map((product) => {
                  const qty = quantities[product.id] || 0
                  const selected = qty > 0
                  const isZeroPrice = product.priceCents === 0

                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`sale-product-card${selected ? ' selected' : ''}`}
                      onClick={() => handleProductTap(product)}
                    >
                      <div className="sale-product-card-top">
                        <span className="sale-product-name">{product.name}</span>
                        {selected && (
                          <span className="sale-product-badge" aria-label={`Quantidade ${qty}`}>
                            {qty}
                          </span>
                        )}
                      </div>
                      <span className="sale-product-price">
                        {isZeroPrice ? 'Preço a definir' : formatBRL(product.priceCents)}
                      </span>
                    </button>
                  )
                })}
              </div>

              {zeroPriceNotice && (
                <p role="status" className="form-alert">
                  {zeroPriceNotice}
                </p>
              )}
            </>
          )}

          <div className="sale-order-card">
            <h2 className="sale-card-title">Pedido</h2>

            {lines.length === 0 ? (
              <p className="sale-order-empty">Toque nos produtos para montar o pedido.</p>
            ) : (
              <div className="sale-order-lines">
                {lines.map((line) => (
                  <div key={line.productId} className="sale-order-line">
                    <div className="sale-order-line-info">
                      <span className="sale-order-line-name">{line.name}</span>
                      <span className="sale-order-line-subtotal money">
                        {formatBRL(line.priceCents * line.quantity)}
                      </span>
                    </div>

                    <div className="sale-order-controls">
                      <button
                        type="button"
                        className="sale-qty-btn"
                        aria-label={`Diminuir ${line.name}`}
                        onClick={() => handleDecreaseQuantity(line.productId)}
                      >
                        −
                      </button>
                      <span className="sale-order-qty">{line.quantity}</span>
                      <button
                        type="button"
                        className="sale-qty-btn"
                        aria-label={`Aumentar ${line.name}`}
                        onClick={() => handleIncreaseQuantity(line.productId)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="sale-order-total-row">
              <span className="sale-order-total-label">Total</span>
              <span className="sale-order-total-value">{formatBRL(itemsTotalCents)}</span>
            </div>
          </div>
        </section>
      ) : (
        <section aria-label="Valor avulso" className="sale-section">
          <div className="sale-order-card">
            <label htmlFor="sale-avulso-input" className="form-label">
              Valor da venda
            </label>
            <input
              id="sale-avulso-input"
              name="avulso"
              type="text"
              inputMode="numeric"
              className="input-field sale-avulso-input"
              value={avulsoDisplay}
              onChange={handleAvulsoChange}
            />
            <div className="sale-order-total-row">
              <span className="sale-order-total-label">Total</span>
              <span className="sale-order-total-value">{formatBRL(avulsoCents)}</span>
            </div>
          </div>
        </section>
      )}

      <section aria-label="Pagamento e cliente" className="sale-section">
        <div className="form-group">
          <label htmlFor="sale-customer-name" className="form-label">
            Nome de quem comprou
          </label>
          <input
            id="sale-customer-name"
            name="customerName"
            type="text"
            className="input-field"
            maxLength={100}
            placeholder="Opcional (obrigatório no fiado)"
            value={customerName}
            onChange={(event) => {
              setSubmitError('')
              setCustomerName(event.target.value)
            }}
          />
        </div>

        <div className="form-group">
          <span className="form-label">Forma de pagamento</span>
          <div className="sale-payment-grid">
            {PAYMENT_OPTIONS.map((option) => {
              const selected = paymentMethod === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  className={`sale-payment-btn${selected ? ' selected' : ''}`}
                  onClick={() => {
                    setSubmitError('')
                    setPaymentMethod(option.value)
                  }}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="sale-toggles-row">
          <button
            type="button"
            aria-pressed={mode === 'avulso'}
            className={`sale-avulso-toggle${mode === 'avulso' ? ' active' : ''}`}
            onClick={handleToggleAvulso}
          >
            Valor avulso
          </button>

          <label htmlFor="sale-pending-switch" className="switch-row sale-pending-switch">
            <span className="form-label">A receber (fiado)</span>
            <span className="switch-control">
              <input
                id="sale-pending-switch"
                name="pending"
                type="checkbox"
                className="switch-input"
                checked={pending}
                onChange={(event) => {
                  setSubmitError('')
                  setPending(event.target.checked)
                }}
              />
              <span className="switch-track" aria-hidden="true">
                <span className="switch-thumb" />
              </span>
            </span>
          </label>
        </div>

        {submitError && (
          <p role="alert" className="form-alert">
            {submitError}
          </p>
        )}
      </section>

      <div className="sale-bottom-bar">
        <div className="sale-bottom-bar-inner">
          <button
            type="button"
            className="btn-primary sale-save-btn"
            disabled={isSubmitDisabled}
            onClick={handleSaveSale}
          >
            {currentTotalCents > 0
              ? `Salvar venda · ${formatBRL(currentTotalCents)}`
              : 'Salvar venda'}
          </button>
          {isSubmitDisabled && disabledReason && (
            <p className="sale-disabled-hint">{disabledReason}</p>
          )}
        </div>
      </div>
    </main>
  )
}
