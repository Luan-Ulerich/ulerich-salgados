import { describe, expect, it } from 'vitest'
import { buildSalePayload, orderTotal } from './sale.js'

describe('sale utils', () => {
  it('calcula o total com 2 linhas em centavos inteiros', () => {
    const lines = [
      { productId: 1, name: 'Coxinha', priceCents: 650, quantity: 2 },
      { productId: 2, name: 'Risole', priceCents: 500, quantity: 3 },
    ]
    const total = orderTotal(lines)
    expect(total).toBe(2800)
    expect(Number.isInteger(total)).toBe(true)
  })

  it('monta payload de itens sem preço e sem totalCents', () => {
    const payload = buildSalePayload({
      mode: 'items',
      lines: [
        { productId: 10, name: 'Coxinha', priceCents: 650, quantity: 2 },
        { productId: 20, name: 'Kibe', priceCents: 600, quantity: 1 },
      ],
      avulsoCents: 9999,
      paymentMethod: 'PIX',
      pending: false,
      customerName: 'Maria',
    })

    expect(payload).toEqual({
      items: [
        { productId: 10, quantity: 2 },
        { productId: 20, quantity: 1 },
      ],
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      customerName: 'Maria',
    })
    expect('totalCents' in payload).toBe(false)
    expect('priceCents' in payload.items[0]).toBe(false)
    expect('unitPriceCents' in payload.items[0]).toBe(false)
  })

  it('monta payload avulso sem o campo items', () => {
    const payload = buildSalePayload({
      mode: 'avulso',
      lines: [{ productId: 10, name: 'Coxinha', priceCents: 650, quantity: 2 }],
      avulsoCents: 1500,
      paymentMethod: 'DINHEIRO',
      pending: false,
      customerName: '',
    })

    expect(payload).toEqual({
      totalCents: 1500,
      paymentMethod: 'DINHEIRO',
      paymentStatus: 'PAGO',
    })
    expect('items' in payload).toBe(false)
  })

  it('define paymentStatus como PENDENTE quando pending for true', () => {
    const payload = buildSalePayload({
      mode: 'avulso',
      lines: [],
      avulsoCents: 2000,
      paymentMethod: 'CARTAO',
      pending: true,
      customerName: '  João Silva  ',
    })

    expect(payload).toEqual({
      totalCents: 2000,
      paymentMethod: 'CARTAO',
      paymentStatus: 'PENDENTE',
      customerName: 'João Silva',
    })
  })

  it('omite customerName quando estiver vazio ou só com espaços', () => {
    const payload = buildSalePayload({
      mode: 'items',
      lines: [{ productId: 1, priceCents: 650, quantity: 1 }],
      avulsoCents: 0,
      paymentMethod: 'PIX',
      pending: false,
      customerName: '   ',
    })

    expect(payload).toEqual({
      items: [{ productId: 1, quantity: 1 }],
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
    })
    expect('customerName' in payload).toBe(false)
  })
})
