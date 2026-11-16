const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(cents) {
  const safeCents = Number.isInteger(cents)
    ? cents
    : Number.parseInt(String(cents ?? 0), 10) || 0
  const isNegative = safeCents < 0
  const absDigits = String(Math.abs(safeCents)).padStart(3, '0')
  const reaisPart = absDigits.slice(0, -2)
  const centavosPart = absDigits.slice(-2)
  const decimalString = `${isNegative ? '-' : ''}${reaisPart}.${centavosPart}`
  return brlFormatter.format(decimalString)
}

export function maskCentsInput(texto) {
  const digits = String(texto ?? '').replace(/\D/g, '')
  const trimmedDigits = digits.replace(/^0+/, '').slice(0, 12)
  const cents = trimmedDigits === '' ? 0 : Number.parseInt(trimmedDigits, 10)

  return {
    cents,
    display: formatBRL(cents),
  }
}
