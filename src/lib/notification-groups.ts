const DAY_MS = 24 * 60 * 60 * 1000

export function groupNotificationsByDate<T extends { created_at: string | Date }>(
  items: T[],
): { label: string; items: T[] }[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS)
  const startOfWeek = new Date(startOfToday.getTime() - 6 * DAY_MS)

  const buckets: { label: string; items: T[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Esta semana", items: [] },
    { label: "Anteriores", items: [] },
  ]

  for (const item of items) {
    const createdAt = new Date(item.created_at)
    if (createdAt >= startOfToday) buckets[0].items.push(item)
    else if (createdAt >= startOfYesterday) buckets[1].items.push(item)
    else if (createdAt >= startOfWeek) buckets[2].items.push(item)
    else buckets[3].items.push(item)
  }

  return buckets.filter((bucket) => bucket.items.length > 0)
}
