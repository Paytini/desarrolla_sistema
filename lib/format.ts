const PORTAL_TIME_ZONE =
  process.env.PORTAL_TIME_ZONE ||
  process.env.NEXT_PUBLIC_PORTAL_TIME_ZONE ||
  "America/Tijuana"

type DateInput = Date | string | number | null | undefined

function parseDateInput(date: DateInput) {
  if (!date) {
    return null
  }

  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof date === "number") {
    const parsedDate = new Date(date)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const value = date.trim()
  if (!value) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`)
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`)
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function formatDate(date: DateInput) {
  const parsedDate = parseDateInput(date)
  if (!parsedDate) return "Sin fecha"

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: PORTAL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate)
}

export function formatDateTime(date: DateInput) {
  const parsedDate = parseDateInput(date)
  if (!parsedDate) return "Sin fecha"

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: PORTAL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate)
}
