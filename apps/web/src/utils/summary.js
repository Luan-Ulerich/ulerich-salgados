export function sharePercent(partCents, totalCents) {
  const safeTotal = Number.isInteger(totalCents)
    ? totalCents
    : Number.parseInt(String(totalCents ?? 0), 10) || 0
  const safePart = Number.isInteger(partCents)
    ? partCents
    : Number.parseInt(String(partCents ?? 0), 10) || 0

  if (safeTotal <= 0 || safePart <= 0) {
    return 0
  }

  if (safePart >= safeTotal) {
    return 100
  }

  return Math.min(100, Math.max(0, Math.round((safePart * 100) / safeTotal)))
}

export function barHeights(byDay = [], maxPx = 96, stubPx = 3) {
  if (!Array.isArray(byDay) || byDay.length === 0) {
    return []
  }

  const values = byDay.map((item) => {
    const raw = typeof item === 'number' ? item : item?.totalCents
    const cents = Number.isInteger(raw) ? raw : Number.parseInt(String(raw ?? 0), 10) || 0
    return cents > 0 ? cents : 0
  })

  const maxCents = Math.max(0, ...values)

  if (maxCents === 0) {
    return values.map(() => stubPx)
  }

  return values.map((cents) => {
    if (cents === 0) {
      return stubPx
    }
    if (cents === maxCents) {
      return maxPx
    }
    return Math.max(stubPx, Math.round((cents * maxPx) / maxCents))
  })
}

export function bestDay(byDay = []) {
  if (!Array.isArray(byDay) || byDay.length === 0) {
    return null
  }

  let winner = null
  let winnerCents = 0

  for (const day of byDay) {
    const raw = day?.totalCents
    const cents = Number.isInteger(raw) ? raw : Number.parseInt(String(raw ?? 0), 10) || 0
    if (cents > 0 && cents > winnerCents) {
      winner = day
      winnerCents = cents
    }
  }

  return winner
}
