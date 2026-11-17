import { useEffect, useRef, useState } from 'react'
import { request } from '../api/client.js'
import {
  formatLongDayPt,
  monthLabelPt,
  shiftMonth,
  todayInSP,
} from '../utils/dates.js'
import { formatBRL } from '../utils/money.js'
import { barHeights, bestDay, sharePercent } from '../utils/summary.js'

const PAYMENT_METHODS_ORDER = [
  { key: 'DINHEIRO', label: 'Dinheiro', colorClass: 'summary-method-fill-cash' },
  { key: 'PIX', label: 'Pix', colorClass: 'summary-method-fill-pix' },
  { key: 'CARTAO', label: 'Cartão', colorClass: 'summary-method-fill-card' },
]

function buildSummaryUrl({ activeTab, today, selectedMonth }) {
  if (activeTab === 'today') {
    return `/summary/day?date=${today}`
  }
  return `/summary/month?month=${selectedMonth}`
}

function buildPendingSalesUrl() {
  return '/sales?paymentStatus=PENDENTE'
}

function formatYmdToDayMonth(ymd) {
  const parts = String(ymd ?? '').split('-')
  if (parts.length !== 3) {
    return ''
  }
  return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}`
}

function parseDayNumber(ymd) {
  const parts = String(ymd ?? '').split('-')
  if (parts.length !== 3) {
    return 0
  }
  return Number.parseInt(parts[2], 10) || 0
}

export function SummaryPage() {
  const today = todayInSP()
  const currentMonth = today.slice(0, 7)

  const [activeTab, setActiveTab] = useState('month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [summary, setSummary] = useState(null)
  const [openPendingCents, setOpenPendingCents] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  const requestCounterRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestCounterRef.current
    const currentToday = todayInSP()
    const summaryUrl = buildSummaryUrl({
      activeTab,
      today: currentToday,
      selectedMonth,
    })

    const pendingPromise = request(buildPendingSalesUrl())
      .then((salesList) => {
        if (!Array.isArray(salesList)) {
          return null
        }
        return salesList.reduce(
          (sum, sale) => sum + (Number.isInteger(sale?.totalCents) ? sale.totalCents : 0),
          0
        )
      })
      .catch(() => null)

    async function loadSummary() {
      setLoading(true)
      setError('')

      try {
        const [summaryData, pendingSum] = await Promise.all([
          request(summaryUrl),
          pendingPromise,
        ])

        if (requestCounterRef.current !== requestId) {
          return
        }

        setSummary(summaryData)
        setOpenPendingCents(pendingSum)
      } catch (err) {
        if (requestCounterRef.current !== requestId) {
          return
        }
        if (err instanceof TypeError) {
          setError('Sem conexão. Verifique a internet e tente de novo.')
        } else {
          setError(err?.data?.message || err?.message || 'Não foi possível carregar o resumo.')
        }
      } finally {
        if (requestCounterRef.current === requestId) {
          setLoading(false)
        }
      }
    }

    loadSummary()
  }, [activeTab, selectedMonth, reloadCount])

  function handleRetry() {
    setReloadCount((count) => count + 1)
  }

  function handlePrevMonth() {
    setSelectedMonth((prev) => shiftMonth(prev, -1))
  }

  function handleNextMonth() {
    setSelectedMonth((prev) => {
      if (prev >= currentMonth) {
        return prev
      }
      return shiftMonth(prev, 1)
    })
  }

  const monthFullLabel = monthLabelPt(selectedMonth)
  const monthNameOnly = monthFullLabel.split(' de ')[0] || selectedMonth
  const periodSubtitle = activeTab === 'today' ? formatLongDayPt(today) : monthFullLabel
  const isCurrentMonth = selectedMonth >= currentMonth

  const totalCents = Number.isInteger(summary?.totalCents) ? summary.totalCents : 0
  const salesCount = Number.isInteger(summary?.salesCount) ? summary.salesCount : 0
  const byPaymentMethod = Array.isArray(summary?.byPaymentMethod) ? summary.byPaymentMethod : []
  const byDay = Array.isArray(summary?.byDay) ? summary.byDay : []
  const topProducts = Array.isArray(summary?.topProducts) ? summary.topProducts : []

  const heights = activeTab === 'month' ? barHeights(byDay) : []
  const best = activeTab === 'month' ? bestDay(byDay) : null
  const lastDayNumber = byDay.length > 0 ? parseDayNumber(byDay[byDay.length - 1].date) : 30

  const chartAriaLabel = best
    ? `Vendas por dia em ${monthNameOnly}. Melhor dia: ${parseDayNumber(best.date)}, ${formatBRL(best.totalCents)}.`
    : 'Nenhuma venda neste mês.'

  const daysWithSalesDesc =
    activeTab === 'month'
      ? byDay
          .filter((day) => (day?.totalCents ?? 0) > 0 || (day?.count ?? 0) > 0)
          .slice()
          .reverse()
      : []

  return (
    <main className="page-container summary-page">
      <header className="summary-header">
        <div className="sales-tabs" role="group" aria-label="Período do resumo">
          <button
            type="button"
            aria-pressed={activeTab === 'today'}
            className={`sales-tab-btn${activeTab === 'today' ? ' active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            Hoje
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'month'}
            className={`sales-tab-btn${activeTab === 'month' ? ' active' : ''}`}
            onClick={() => setActiveTab('month')}
          >
            Mês
          </button>
        </div>

        <div className="summary-title-row">
          <div className="summary-title-block">
            <h1 className="page-title">Resumo</h1>
            <p className="summary-period-label">{periodSubtitle}</p>
          </div>

          {activeTab === 'month' && (
            <div className="summary-month-nav">
              <button
                type="button"
                className="summary-month-btn"
                aria-label="Mês anterior"
                onClick={handlePrevMonth}
              >
                ‹
              </button>
              <button
                type="button"
                className="summary-month-btn"
                aria-label="Próximo mês"
                disabled={isCurrentMonth}
                onClick={handleNextMonth}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </header>

      {loading && <p className="products-state">Carregando resumo...</p>}

      {!loading && error && (
        <div role="alert" className="products-state-card">
          <p className="products-error-text">{error}</p>
          <button type="button" className="btn-secondary" onClick={handleRetry}>
            Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && summary && (
        <div className="summary-content">
          <section className="summary-hero-card" aria-label="Total recebido">
            <span className="summary-hero-label">
              {activeTab === 'today' ? 'Recebido hoje' : `Recebido em ${monthNameOnly}`}
            </span>
            <strong className="summary-hero-total money">{formatBRL(totalCents)}</strong>
            <div className="summary-hero-meta">
              <span>
                {salesCount} {salesCount === 1 ? 'venda paga' : 'vendas pagas'}
              </span>
              {openPendingCents !== null && (
                <span>A receber {formatBRL(openPendingCents)}</span>
              )}
            </div>
          </section>

          {salesCount === 0 && totalCents === 0 && (
            <p className="summary-empty-period">Nenhuma venda recebida neste período.</p>
          )}

          <section className="summary-card" aria-label="Por forma de pagamento">
            <h2 className="summary-card-title">Por forma de pagamento</h2>
            <div className="summary-methods-list">
              {PAYMENT_METHODS_ORDER.map((methodMeta) => {
                const found = byPaymentMethod.find(
                  (item) => item?.paymentMethod === methodMeta.key
                )
                const methodCents = Number.isInteger(found?.totalCents) ? found.totalCents : 0
                const pct = sharePercent(methodCents, totalCents)

                return (
                  <div key={methodMeta.key} className="summary-method-row">
                    <span className="summary-method-label">{methodMeta.label}</span>
                    <div className="summary-method-track" aria-hidden="true">
                      <div
                        className={`summary-method-fill ${methodMeta.colorClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="summary-method-value money">
                      {formatBRL(methodCents)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {activeTab === 'month' && (
            <>
              <section className="summary-card" aria-label="Vendas por dia">
                <h2 className="summary-card-title">Vendas por dia</h2>

                <div
                  className="summary-bars-chart"
                  role="img"
                  aria-label={chartAriaLabel}
                >
                  {byDay.map((day, idx) => {
                    const heightPx = heights[idx] ?? 3
                    const isTodayBar =
                      selectedMonth === currentMonth && day.date === today
                    const hasSales = (day?.totalCents ?? 0) > 0

                    let barColorClass = 'summary-bar-zero'
                    if (isTodayBar) {
                      barColorClass = 'summary-bar-today'
                    } else if (hasSales) {
                      barColorClass = 'summary-bar-sale'
                    }

                    return (
                      <div key={day.date} className="summary-bar-col">
                        <div
                          className={`summary-bar ${barColorClass}`}
                          style={{ height: `${heightPx}px` }}
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="summary-bars-axis" aria-hidden="true">
                  <span>1</span>
                  <span>15</span>
                  <span>{lastDayNumber}</span>
                </div>

                {best && (
                  <p className="summary-best-day">
                    Melhor dia: {formatYmdToDayMonth(best.date)} · {formatBRL(best.totalCents)}
                  </p>
                )}

                <details className="summary-day-details">
                  <summary className="summary-day-details-summary">Ver dia a dia</summary>
                  {daysWithSalesDesc.length === 0 ? (
                    <p className="summary-details-empty">Nenhum dia com vendas neste mês.</p>
                  ) : (
                    <ul className="summary-day-list">
                      {daysWithSalesDesc.map((day) => (
                        <li key={day.date} className="summary-day-item">
                          <span className="summary-day-date">
                            {formatYmdToDayMonth(day.date)}
                          </span>
                          <span className="summary-day-count">
                            {day.count} {day.count === 1 ? 'venda' : 'vendas'}
                          </span>
                          <span className="summary-day-total money">
                            {formatBRL(day.totalCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </section>

              <section className="summary-card" aria-label="Mais vendidos">
                <h2 className="summary-card-title">Mais vendidos</h2>

                {topProducts.length === 0 ? (
                  <p className="summary-top-empty">Sem vendas com produtos neste mês.</p>
                ) : (
                  <ol className="summary-top-list">
                    {topProducts.map((product, index) => (
                      <li
                        key={product.productId ?? `${product.name}-${index}`}
                        className="summary-top-item"
                      >
                        <span className="summary-top-rank">{index + 1}</span>
                        <span className="summary-top-name">{product.name}</span>
                        <span className="summary-top-qty">{product.quantity} un.</span>
                        <span className="summary-top-total money">
                          {formatBRL(product.totalCents)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                <p className="summary-top-footnote">
                  Vendas de valor avulso não entram nesta lista.
                </p>
              </section>
            </>
          )}
        </div>
      )}
    </main>
  )
}
