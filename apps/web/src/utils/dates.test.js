import { describe, expect, it } from 'vitest'
import {
  formatDayMonthSP,
  formatLongDayPt,
  formatTimeSP,
  monthRangeOf,
  shiftDay,
  todayInSP,
} from './dates.js'

describe('dates utils (America/Sao_Paulo)', () => {
  it('2026-11-17T02:30:00Z é 23:30 do dia 16 em São Paulo (todayInSP devolve 2026-11-16)', () => {
    const instant = new Date('2026-11-17T02:30:00Z')
    expect(todayInSP(instant)).toBe('2026-11-16')
    expect(formatTimeSP('2026-11-17T02:30:00Z')).toBe('23:30')
  })

  it('2026-11-17T03:30:00Z já é dia 17 em São Paulo', () => {
    const instant = new Date('2026-11-17T03:30:00Z')
    expect(todayInSP(instant)).toBe('2026-11-17')
    expect(formatTimeSP('2026-11-17T03:30:00Z')).toBe('00:30')
  })

  it('shiftDay atravessa fim de mês e fim de ano usando Date.UTC', () => {
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31')
    expect(shiftDay('2026-11-30', 1)).toBe('2026-12-01')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('monthRangeOf calcula fevereiro de ano bissexto e não bissexto', () => {
    expect(monthRangeOf('2024-02-15')).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
      month: '2024-02',
    })

    expect(monthRangeOf('2026-02-10')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      month: '2026-02',
    })
  })

  it('formata dia/mês no fuso de São Paulo e data longa em pt-BR', () => {
    expect(formatDayMonthSP('2026-11-19T18:00:00Z')).toBe('19/11')
    expect(formatDayMonthSP('2026-11-20T02:30:00Z')).toBe('19/11')
    expect(formatLongDayPt('2026-11-16')).toBe('segunda-feira, 16 de novembro')
  })
})
