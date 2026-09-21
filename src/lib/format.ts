export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return text
  return text
    .replace(/&#8211;|&#x2013;/g, "–")
    .replace(/&#8212;|&#x2014;/g, "—")
    .replace(/&#8216;|&#x2018;/g, "‘")
    .replace(/&#8217;|&#x2019;/g, "’")
    .replace(/&#8220;|&#x201C;/g, "“")
    .replace(/&#8221;|&#x201D;/g, "”")
    .replace(/&#8230;|&#x2026;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim()
}

const PORTAL_TIME_ZONE =
  process.env.PORTAL_TIME_ZONE || process.env.NEXT_PUBLIC_PORTAL_TIME_ZONE || "America/Tijuana"

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
