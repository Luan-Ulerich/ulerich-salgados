const SP_TIMEZONE = 'America/Sao_Paulo'

const spDatePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const spTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const spDayMonthFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
})

const spLongDayPtFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function parseYmd(ymd) {
  const [yearStr, monthStr, dayStr] = String(ymd ?? '').split('-')
  return {
    year: Number.parseInt(yearStr, 10),
    month: Number.parseInt(monthStr, 10),
    day: Number.parseInt(dayStr, 10),
  }
}

function formatUtcYmd(date) {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayInSP(now = new Date()) {
  const dateObj = now instanceof Date ? now : new Date(now)
  const parts = spDatePartsFormatter.formatToParts(dateObj)
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export function shiftDay(ymd, delta) {
  const { year, month, day } = parseYmd(ymd)
  const utcMs = Date.UTC(year, month - 1, day + Number(delta || 0))
  return formatUtcYmd(new Date(utcMs))
}

export function monthRangeOf(ymd) {
  const { year, month } = parseYmd(ymd)
  const yearPad = String(year).padStart(4, '0')
  const monthPad = String(month).padStart(2, '0')
  const ym = `${yearPad}-${monthPad}`
  const from = `${ym}-01`
  const lastDayUtc = new Date(Date.UTC(year, month, 0))
  const to = formatUtcYmd(lastDayUtc)
  return { from, to, month: ym }
}

export function formatTimeSP(iso) {
  if (!iso) {
    return ''
  }
  const dateObj = iso instanceof Date ? iso : new Date(iso)
  return spTimeFormatter.format(dateObj)
}

export function formatDayMonthSP(iso) {
  if (!iso) {
    return ''
  }
  const dateObj = iso instanceof Date ? iso : new Date(iso)
  return spDayMonthFormatter.format(dateObj)
}

export function formatLongDayPt(ymd) {
  if (!ymd) {
    return ''
  }
  const { year, month, day } = parseYmd(ymd)
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return spLongDayPtFormatter.format(utcDate)
}
