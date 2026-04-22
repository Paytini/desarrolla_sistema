export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "Sin fecha"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}
