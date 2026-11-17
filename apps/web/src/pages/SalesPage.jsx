import { useEffect, useRef, useState } from 'react'
import { request } from '../api/client.js'
import {
  formatDayMonthSP,
  formatLongDayPt,
  formatTimeSP,
  monthRangeOf,
  shiftDay,
  todayInSP,
} from '../utils/dates.js'
import { formatBRL } from '../utils/money.js'

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: 'month', label: 'Mês' },
  { id: 'custom', label: 'Outro dia' },
]

const METHOD_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'Pix' },
  { value: 'CARTAO', label: 'Cartão' },
]

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

const METHOD_BADGE_MAP = {
  DINHEIRO: {
    label: 'Dinheiro',
    icon: (
      <svg
        width="16"
        height="16"
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
      </svg>
    ),
  },
  PIX: {
    label: 'Pix',
    icon: (
      <svg
        width="16"
        height="16"
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
  CARTAO: {
    label: 'Cartão',
    icon: (
      <svg
        width="16"
        height="16"
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
      </svg>
    ),
  },
}

function buildSalesQuery({ period, customDate, paymentMethod }) {
  const today = todayInSP()
  let from = today
  let to = today
  let summaryPath = `/summary/day?date=${today}`

  if (period === 'yesterday') {
    const yesterday = shiftDay(today, -1)
    from = yesterday
    to = yesterday
    summaryPath = `/summary/day?date=${yesterday}`
  } else if (period === 'month') {
    const range = monthRangeOf(today)
    from = range.from
    to = range.to
    summaryPath = `/summary/month?month=${range.month}`
  } else if (period === 'custom') {
    const targetDate = customDate || today
    from = targetDate
    to = targetDate
    summaryPath = `/summary/day?date=${targetDate}`
  }

  const params = new URLSearchParams({ from, to })
  if (paymentMethod) {
    params.set('paymentMethod', paymentMethod)
  }

  return {
    salesPath: `/sales?${params.toString()}`,
    summaryPath,
  }
}

function buildPendingSalesPath() {
  return '/sales?paymentStatus=PENDENTE'
}

function formatSaleItemsSummary(sale) {
  if (!Array.isArray(sale?.items) || sale.items.length === 0) {
    return ''
  }
  return sale.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')
}

function getSaleTitle(sale) {
  const trimmedName = String(sale?.customerName ?? '').trim()
  if (trimmedName) {
    return trimmedName
  }
  const hasItems = Array.isArray(sale?.items) && sale.items.length > 0
  if (!hasItems) {
    return 'Venda rápida'
  }
  return 'Cliente não informado'
}

export function SalesPage() {
  const [activeTab, setActiveTab] = useState('vendas')
  const [period, setPeriod] = useState('today')
  const [customDate, setCustomDate] = useState(() => todayInSP())
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')

  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  const [statusNotice, setStatusNotice] = useState('')
  const [conflictAlert, setConflictAlert] = useState('')

  const [payingSale, setPayingSale] = useState(null)
  const [payMethodChoice, setPayMethodChoice] = useState('')
  const [payingSaving, setPayingSaving] = useState(false)
  const [paySheetError, setPaySheetError] = useState('')

  const [deletingSale, setDeletingSale] = useState(null)
  const [deletingSaving, setDeletingSaving] = useState(false)
  const [deleteSheetError, setDeleteSheetError] = useState('')

  const requestCounterRef = useRef(0)
  const statusNoticeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (statusNoticeTimerRef.current) {
        clearTimeout(statusNoticeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (payingSale && !payingSaving) {
          setPayingSale(null)
          setPayMethodChoice('')
          setPaySheetError('')
        }
        if (deletingSale && !deletingSaving) {
          setDeletingSale(null)
          setDeleteSheetError('')
        }
      }
    }

    if (payingSale || deletingSale) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [payingSale, payingSaving, deletingSale, deletingSaving])

  useEffect(() => {
    const requestId = ++requestCounterRef.current

    async function loadData() {
      setLoading(true)
      setError('')

      if (activeTab === 'receber') {
        try {
          const data = await request(buildPendingSalesPath())
          if (requestCounterRef.current !== requestId) {
            return
          }
          const list = Array.isArray(data) ? [...data] : []
          list.sort((a, b) => new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime())
          setSales(list)
          setSummary(null)
        } catch (err) {
          if (requestCounterRef.current !== requestId) {
            return
          }
          if (err instanceof TypeError) {
            setError('Sem conexão. Verifique a internet e tente de novo.')
          } else {
            setError(err?.data?.message || err?.message || 'Não foi possível carregar os fiados.')
          }
        } finally {
          if (requestCounterRef.current === requestId) {
            setLoading(false)
          }
        }
        return
      }

      const { salesPath, summaryPath } = buildSalesQuery({
        period,
        customDate,
        paymentMethod: paymentMethodFilter,
      })

      const summaryPromise = request(summaryPath).catch(() => null)

      try {
        const [salesData, summaryData] = await Promise.all([request(salesPath), summaryPromise])
        if (requestCounterRef.current !== requestId) {
          return
        }
        setSales(Array.isArray(salesData) ? salesData : [])
        setSummary(
          summaryData && Number.isInteger(summaryData.totalCents) ? summaryData : null
        )
      } catch (err) {
        if (requestCounterRef.current !== requestId) {
          return
        }
        if (err instanceof TypeError) {
          setError('Sem conexão. Verifique a internet e tente de novo.')
        } else {
          setError(err?.data?.message || err?.message || 'Não foi possível carregar as vendas.')
        }
      } finally {
        if (requestCounterRef.current === requestId) {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [activeTab, period, customDate, paymentMethodFilter, reloadCount])

  async function refreshSummaryOnly() {
    if (activeTab !== 'vendas') {
      return
    }
    const { summaryPath } = buildSalesQuery({
      period,
      customDate,
      paymentMethod: paymentMethodFilter,
    })
    try {
      const summaryData = await request(summaryPath)
      setSummary(summaryData && Number.isInteger(summaryData.totalCents) ? summaryData : null)
    } catch {
      setSummary(null)
    }
  }

  function showTemporaryNotice(message) {
    setStatusNotice(message)
    if (statusNoticeTimerRef.current) {
      clearTimeout(statusNoticeTimerRef.current)
    }
    statusNoticeTimerRef.current = setTimeout(() => {
      setStatusNotice('')
    }, 4000)
  }

  function handleRetry() {
    setReloadCount((count) => count + 1)
  }

  function openPaySheet(sale) {
    setConflictAlert('')
    setPayingSale(sale)
    setPayMethodChoice('')
    setPaySheetError('')
  }

  function closePaySheet() {
    if (payingSaving) {
      return
    }
    setPayingSale(null)
    setPayMethodChoice('')
    setPaySheetError('')
  }

  async function handleConfirmPay() {
    if (!payingSale || !payMethodChoice || payingSaving) {
      return
    }

    setPayingSaving(true)
    setPaySheetError('')

    try {
      const updated = await request(`/sales/${payingSale.id}/pay`, {
        method: 'PATCH',
        body: { paymentMethod: payMethodChoice },
      })

      const receivedCents = Number.isInteger(updated?.totalCents)
        ? updated.totalCents
        : payingSale.totalCents

      setSales((prev) => prev.filter((item) => item.id !== payingSale.id))
      setPayingSale(null)
      setPayMethodChoice('')
      setPaySheetError('')
      showTemporaryNotice(`Recebido · ${formatBRL(receivedCents)}`)
    } catch (err) {
      if (err?.status === 409) {
        const message = err?.data?.message || err?.message || 'Esta venda já foi recebida.'
        setPayingSale(null)
        setPayMethodChoice('')
        setPaySheetError('')
        setConflictAlert(message)
        setReloadCount((count) => count + 1)
      } else if (err instanceof TypeError) {
        setPaySheetError('Sem conexão. Verifique a internet e tente de novo.')
      } else {
        setPaySheetError(err?.data?.message || err?.message || 'Erro ao confirmar recebimento.')
      }
    } finally {
      setPayingSaving(false)
    }
  }

  function openDeleteSheet(sale) {
    setConflictAlert('')
    setDeletingSale(sale)
    setDeleteSheetError('')
  }

  function closeDeleteSheet() {
    if (deletingSaving) {
      return
    }
    setDeletingSale(null)
    setDeleteSheetError('')
  }

  async function handleConfirmDelete() {
    if (!deletingSale || deletingSaving) {
      return
    }

    setDeletingSaving(true)
    setDeleteSheetError('')

    try {
      await request(`/sales/${deletingSale.id}`, {
        method: 'DELETE',
      })

      setSales((prev) => prev.filter((item) => item.id !== deletingSale.id))
      setDeletingSale(null)
      setDeleteSheetError('')

      if (activeTab === 'vendas') {
        await refreshSummaryOnly()
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setDeleteSheetError('Sem conexão. Verifique a internet e tente de novo.')
      } else {
        setDeleteSheetError(err?.data?.message || err?.message || 'Erro ao excluir venda.')
      }
    } finally {
      setDeletingSaving(false)
    }
  }

  const pendingTotalCents =
    activeTab === 'receber'
      ? sales.reduce(
          (sum, sale) => sum + (Number.isInteger(sale.totalCents) ? sale.totalCents : 0),
          0
        )
      : 0

  return (
    <main className="page-container sales-page">
      <header className="sales-header">
        <h1 className="page-title">Vendas</h1>

        <div className="sales-tabs" role="tablist" aria-label="Visões de vendas">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vendas'}
            aria-pressed={activeTab === 'vendas'}
            className={`sales-tab-btn${activeTab === 'vendas' ? ' active' : ''}`}
            onClick={() => {
              setConflictAlert('')
              setActiveTab('vendas')
            }}
          >
            Vendas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'receber'}
            aria-pressed={activeTab === 'receber'}
            className={`sales-tab-btn${activeTab === 'receber' ? ' active' : ''}`}
            onClick={() => {
              setConflictAlert('')
              setActiveTab('receber')
            }}
          >
            A receber
          </button>
        </div>
      </header>

      {statusNotice && (
        <div role="status" className="sale-status-banner">
          {statusNotice}
        </div>
      )}

      {conflictAlert && (
        <p role="alert" className="form-alert">
          {conflictAlert}
        </p>
      )}

      {activeTab === 'vendas' ? (
        <section aria-label="Histórico de vendas" className="sales-section">
          <div className="sales-period-grid" role="group" aria-label="Filtro de período">
            {PERIOD_OPTIONS.map((option) => {
              const selected = period === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  className={`sales-filter-btn${selected ? ' active' : ''}`}
                  onClick={() => setPeriod(option.id)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {period === 'custom' && (
            <div className="form-group">
              <label htmlFor="sales-custom-date" className="form-label">
                Escolher data ({formatLongDayPt(customDate)})
              </label>
              <input
                id="sales-custom-date"
                name="customDate"
                type="date"
                className="input-field"
                value={customDate}
                onChange={(event) => {
                  if (event.target.value) {
                    setCustomDate(event.target.value)
                  }
                }}
              />
            </div>
          )}

          <div
            className="sales-method-grid"
            role="group"
            aria-label="Filtro de forma de pagamento"
          >
            {METHOD_FILTERS.map((filter) => {
              const selected = paymentMethodFilter === filter.value
              return (
                <button
                  key={filter.value || 'ALL'}
                  type="button"
                  aria-pressed={selected}
                  className={`sales-chip-btn${selected ? ' active' : ''}`}
                  onClick={() => setPaymentMethodFilter(filter.value)}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>

          {summary && (
            <div className="sales-summary-card">
              <div className="sales-summary-main">
                <div className="sales-summary-col">
                  <span className="sales-summary-label">Recebido</span>
                  <span className="sales-summary-total money">
                    {formatBRL(summary.totalCents)}
                  </span>
                  <span className="sales-summary-count">
                    {summary.salesCount} {summary.salesCount === 1 ? 'venda' : 'vendas'}
                  </span>
                </div>

                <div className="sales-summary-col sales-summary-col-right">
                  <span className="sales-summary-label">A receber</span>
                  <span className="sales-summary-pending money">
                    {formatBRL(summary.pendingCents)}
                  </span>
                </div>
              </div>

              <p className="sales-summary-note">Inclui fiados recebidos no dia.</p>
            </div>
          )}

          {loading && <p className="products-state">Carregando vendas...</p>}

          {!loading && error && (
            <div role="alert" className="products-state-card">
              <p className="products-error-text">{error}</p>
              <button type="button" className="btn-secondary" onClick={handleRetry}>
                Tentar de novo
              </button>
            </div>
          )}

          {!loading && !error && sales.length === 0 && (
            <p className="products-state">Nenhuma venda neste período.</p>
          )}

          {!loading && !error && sales.length > 0 && (
            <div className="sales-list">
              {sales.map((sale) => {
                const itemsText = formatSaleItemsSummary(sale)
                const methodInfo = METHOD_BADGE_MAP[sale.paymentMethod] || {
                  label: sale.paymentMethod,
                  icon: null,
                }
                const isPending = sale.paymentStatus === 'PENDENTE'
                const soldDaySp = sale.soldAt ? todayInSP(sale.soldAt) : ''
                const paidDaySp = sale.paidAt ? todayInSP(sale.paidAt) : ''
                const paidDifferentDay =
                  sale.paymentStatus === 'PAGO' &&
                  Boolean(sale.paidAt) &&
                  paidDaySp !== soldDaySp

                return (
                  <article key={sale.id} className="sales-card">
                    <div className="sales-card-top">
                      <div className="sales-card-info">
                        <div className="sales-card-title-row">
                          <span className="sales-card-time">{formatTimeSP(sale.soldAt)}</span>
                          <span className="sales-card-customer">{getSaleTitle(sale)}</span>
                        </div>

                        {itemsText && <p className="sales-card-items">{itemsText}</p>}

                        <div className="sales-card-badges">
                          <span className="sales-method-badge">
                            {methodInfo.icon}
                            <span>{methodInfo.label}</span>
                          </span>

                          {isPending && (
                            <span className="sales-pending-badge">A receber</span>
                          )}

                          {paidDifferentDay && (
                            <span className="sales-paid-date-note">
                              Recebido em {formatDayMonthSP(sale.paidAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sales-card-right">
                        <span className="sales-card-total money">
                          {formatBRL(sale.totalCents)}
                        </span>
                        <button
                          type="button"
                          className="sales-delete-icon-btn"
                          aria-label={`Excluir venda de ${formatBRL(sale.totalCents)}`}
                          onClick={() => openDeleteSheet(sale)}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Fiados a receber" className="sales-section">
          <div className="sales-pending-summary-card">
            <div className="sales-summary-col">
              <span className="sales-pending-summary-label">Total a receber</span>
              <span className="sales-pending-summary-total money">
                {formatBRL(pendingTotalCents)}
              </span>
            </div>
            <span className="sales-pending-summary-count">
              {sales.length} {sales.length === 1 ? 'fiado' : 'fiados'}
            </span>
          </div>

          {loading && <p className="products-state">Carregando fiados...</p>}

          {!loading && error && (
            <div role="alert" className="products-state-card">
              <p className="products-error-text">{error}</p>
              <button type="button" className="btn-secondary" onClick={handleRetry}>
                Tentar de novo
              </button>
            </div>
          )}

          {!loading && !error && sales.length === 0 && (
            <p className="products-state">Nenhum fiado em aberto.</p>
          )}

          {!loading && !error && sales.length > 0 && (
            <div className="sales-list">
              {sales.map((sale) => {
                const itemsText = formatSaleItemsSummary(sale)
                return (
                  <article key={sale.id} className="sales-card sales-fiado-card">
                    <div className="sales-card-top">
                      <div className="sales-card-info">
                        <div className="sales-card-title-row">
                          <span className="sales-fiado-customer">{getSaleTitle(sale)}</span>
                          <span className="sales-fiado-date">
                            {formatDayMonthSP(sale.soldAt)}
                          </span>
                        </div>

                        {itemsText && <p className="sales-card-items">{itemsText}</p>}
                      </div>

                      <div className="sales-card-right">
                        <span className="sales-card-total money">
                          {formatBRL(sale.totalCents)}
                        </span>
                        <button
                          type="button"
                          className="sales-delete-icon-btn"
                          aria-label={`Excluir venda de ${formatBRL(sale.totalCents)}`}
                          onClick={() => openDeleteSheet(sale)}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary sales-receive-btn"
                      onClick={() => openPaySheet(sale)}
                    >
                      Recebi
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {payingSale && (
        <div className="sheet-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-sheet-title"
            className="sheet-dialog"
          >
            <h2 id="pay-sheet-title" className="sheet-title">
              Como o cliente pagou?
            </h2>
            <p className="sheet-subtitle">
              {getSaleTitle(payingSale)} · {formatBRL(payingSale.totalCents)}
            </p>

            <div className="sale-payment-grid">
              {PAYMENT_OPTIONS.map((option) => {
                const selected = payMethodChoice === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    className={`sale-payment-btn${selected ? ' selected' : ''}`}
                    onClick={() => {
                      setPaySheetError('')
                      setPayMethodChoice(option.value)
                    }}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>

            {paySheetError && (
              <p role="alert" className="form-alert">
                {paySheetError}
              </p>
            )}

            <div className="sheet-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!payMethodChoice || payingSaving}
                onClick={handleConfirmPay}
              >
                {`Confirmar recebimento · ${formatBRL(payingSale.totalCents)}`}
              </button>
              <button
                type="button"
                className="btn-secondary btn-full"
                disabled={payingSaving}
                onClick={closePaySheet}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingSale && (
        <div className="sheet-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-sheet-title"
            className="sheet-dialog"
          >
            <h2 id="delete-sheet-title" className="sheet-title">
              Excluir esta venda?
            </h2>
            <p className="sheet-subtitle">
              {formatDayMonthSP(deletingSale.soldAt)} às {formatTimeSP(deletingSale.soldAt)} ·{' '}
              {getSaleTitle(deletingSale)} · {formatBRL(deletingSale.totalCents)}
            </p>

            {deleteSheetError && (
              <p role="alert" className="form-alert">
                {deleteSheetError}
              </p>
            )}

            <div className="sheet-actions">
              <button
                type="button"
                className="btn-danger"
                disabled={deletingSaving}
                onClick={handleConfirmDelete}
              >
                Excluir
              </button>
              <button
                type="button"
                className="btn-secondary btn-full"
                disabled={deletingSaving}
                onClick={closeDeleteSheet}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
