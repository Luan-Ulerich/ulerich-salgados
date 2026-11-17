import { describe, expect, it } from 'vitest'
import { barHeights, bestDay, sharePercent } from './summary.js'

describe('summary utils', () => {
  it('sharePercent retorna 0 quando o total é 0 e calcula inteiro de 0 a 100 com partes', () => {
    expect(sharePercent(0, 0)).toBe(0)
    expect(sharePercent(1500, 0)).toBe(0)
    expect(sharePercent(0, 5000)).toBe(0)
    expect(sharePercent(2500, 10000)).toBe(25)
    expect(sharePercent(5000, 10000)).toBe(50)
    expect(sharePercent(10000, 10000)).toBe(100)
    expect(sharePercent(1000, 3000)).toBe(33)
  })

  it('barHeights calcula alturas com um dia dominante e dias zerados', () => {
    const byDay = [
      { date: '2026-11-01', totalCents: 0, count: 0 },
      { date: '2026-11-02', totalCents: 5000, count: 2 },
      { date: '2026-11-03', totalCents: 10000, count: 4 },
      { date: '2026-11-04', totalCents: 2500, count: 1 },
    ]

    expect(barHeights(byDay, 96, 3)).toEqual([3, 48, 96, 24])
  })

  it('barHeights retorna stubPx para todos quando o mês inteiro está zerado', () => {
    const byDay = [
      { date: '2026-11-01', totalCents: 0, count: 0 },
      { date: '2026-11-02', totalCents: 0, count: 0 },
      { date: '2026-11-03', totalCents: 0, count: 0 },
    ]

    expect(barHeights(byDay, 96, 3)).toEqual([3, 3, 3])
  })

  it('bestDay encontra o maior dia e mantém o primeiro em caso de empate', () => {
    const byDay = [
      { date: '2026-11-01', totalCents: 2000, count: 1 },
      { date: '2026-11-06', totalCents: 9500, count: 5 },
      { date: '2026-11-12', totalCents: 9500, count: 3 },
      { date: '2026-11-15', totalCents: 4000, count: 2 },
    ]

    expect(bestDay(byDay)).toEqual({
      date: '2026-11-06',
      totalCents: 9500,
      count: 5,
    })
  })

  it('bestDay retorna null quando não há vendas no mês', () => {
    const byDay = [
      { date: '2026-11-01', totalCents: 0, count: 0 },
      { date: '2026-11-02', totalCents: 0, count: 0 },
    ]

    expect(bestDay(byDay)).toBeNull()
    expect(bestDay([])).toBeNull()
  })
})
