export function orderTotal(lines = []) {
  if (!Array.isArray(lines)) {
    return 0
  }

  return lines.reduce((sum, line) => {
    const priceCents = Number.isInteger(line?.priceCents) ? line.priceCents : 0
    const quantity = Number.isInteger(line?.quantity) ? line.quantity : 0
    return sum + priceCents * quantity
  }, 0)
}

export function buildSalePayload({
  mode,
  lines = [],
  avulsoCents = 0,
  paymentMethod,
  pending = false,
  customerName = '',
}) {
  const paymentStatus = pending ? 'PENDENTE' : 'PAGO'
  const trimmedCustomerName = String(customerName ?? '').trim()

  const payload =
    mode === 'avulso'
      ? {
          totalCents: avulsoCents,
          paymentMethod,
          paymentStatus,
        }
      : {
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
          paymentMethod,
          paymentStatus,
        }

  if (trimmedCustomerName.length > 0) {
    payload.customerName = trimmedCustomerName
  }

  return payload
}
