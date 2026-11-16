import { describe, expect, it } from 'vitest'
import { formatBRL, maskCentsInput } from './money.js'

function normalizeSpaces(value) {
  return value.replace(/\u00a0/g, ' ')
}

describe('money utils', () => {
  describe('formatBRL', () => {
    it('formata 0 centavos como R$ 0,00', () => {
      expect(normalizeSpaces(formatBRL(0))).toBe('R$ 0,00')
    })

    it('formata 650 centavos como R$ 6,50', () => {
      expect(normalizeSpaces(formatBRL(650))).toBe('R$ 6,50')
    })

    it('formata 100000 centavos como R$ 1.000,00', () => {
      expect(normalizeSpaces(formatBRL(100000))).toBe('R$ 1.000,00')
    })
  })

  describe('maskCentsInput', () => {
    it('retorna 0 centavos quando o texto é vazio', () => {
      const result = maskCentsInput('')
      expect(result.cents).toBe(0)
      expect(Number.isInteger(result.cents)).toBe(true)
      expect(normalizeSpaces(result.display)).toBe('R$ 0,00')
    })

    it('converte dígitos entrando pela direita (6, 5, 0 -> 650)', () => {
      const step1 = maskCentsInput('6')
      expect(step1.cents).toBe(6)
      expect(normalizeSpaces(step1.display)).toBe('R$ 0,06')

      const step2 = maskCentsInput(`${step1.display}5`)
      expect(step2.cents).toBe(65)
      expect(normalizeSpaces(step2.display)).toBe('R$ 0,65')

      const step3 = maskCentsInput(`${step2.display}0`)
      expect(step3.cents).toBe(650)
      expect(normalizeSpaces(step3.display)).toBe('R$ 6,50')
    })

    it('formata 0, 650 e 100000 corretamente', () => {
      expect(maskCentsInput('0').cents).toBe(0)
      expect(normalizeSpaces(maskCentsInput('0').display)).toBe('R$ 0,00')

      expect(maskCentsInput('650').cents).toBe(650)
      expect(normalizeSpaces(maskCentsInput('650').display)).toBe('R$ 6,50')

      expect(maskCentsInput('100000').cents).toBe(100000)
      expect(normalizeSpaces(maskCentsInput('100000').display)).toBe('R$ 1.000,00')
    })

    it('ignora letras e símbolos não numéricos', () => {
      const withLetters = maskCentsInput('abcR$ 6,50xyz!')
      expect(withLetters.cents).toBe(650)
      expect(normalizeSpaces(withLetters.display)).toBe('R$ 6,50')

      const onlyLetters = maskCentsInput('apenas letras')
      expect(onlyLetters.cents).toBe(0)
      expect(normalizeSpaces(onlyLetters.display)).toBe('R$ 0,00')
    })
  })
})
