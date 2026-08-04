export const CONSULTING_TIME_ZONE = "America/Tijuana"

export const CONSULTING_TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]

const BOOKING_HORIZON_DAYS = 42 // 6 weeks

const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
]

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** "Today" as a wall-clock date in America/Tijuana, regardless of the caller's local timezone. */
export function getTodayInConsultingTimeZone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CONSULTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function isBusinessDayString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValidCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  if (!isValidCalendarDate) return false
  const weekday = date.getUTCDay()
  return weekday >= 1 && weekday <= 5
}

/** The earliest bookable day: the next business day after today (today itself is blocked). */
export function getMinSelectableDate(): string {
  let cursor = addDaysToDateString(getTodayInConsultingTimeZone(), 1)
  while (!isBusinessDayString(cursor)) {
    cursor = addDaysToDateString(cursor, 1)
  }
  return cursor
}

export function getMaxSelectableDate(): string {
  return addDaysToDateString(getTodayInConsultingTimeZone(), BOOKING_HORIZON_DAYS)
}

export function isDateSelectable(dateStr: string): boolean {
  if (!isBusinessDayString(dateStr)) return false
  return dateStr >= getMinSelectableDate() && dateStr <= getMaxSelectableDate()
}

export function isTimeSlotValid(time: string): boolean {
  return CONSULTING_TIME_SLOTS.includes(time)
}

/** Current UTC offset label for America/Tijuana, e.g. "GMT-7" (adjusts for DST automatically). */
export function getConsultingTimeZoneLabel(): string {
  const offset = new Intl.DateTimeFormat("es-MX", {
    timeZone: CONSULTING_TIME_ZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value

  return `Pacífico de México (Tijuana)${offset ? `, ${offset}` : ""}`
}

/** e.g. "Martes 5 de agosto, 10:00 a. m. (Pacífico)" */
export function formatConsultingDateTime(dateStr: string, time: string): string {
  if (!dateStr || !time) return ""

  const [year, month, day] = dateStr.split("-").map(Number)
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  const monthName = MONTH_NAMES[month - 1]

  const [hourStr, minuteStr] = time.split(":")
  const hour24 = Number(hourStr)
  const period = hour24 < 12 ? "a. m." : "p. m."
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalizedWeekday} ${day} de ${monthName}, ${hour12}:${minuteStr} ${period} (Pacífico)`
}
