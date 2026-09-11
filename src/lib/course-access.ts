export function isCourseAccessExpired(
  course: { access_expires_at: Date | null; completed: boolean },
  now: Date = new Date(),
): boolean {
  if (!course.access_expires_at || course.completed) return false
  return course.access_expires_at.getTime() < now.getTime()
}

export function parseAccessDeadlineInput(
  value: string,
): { ok: true; date: Date | null } | { ok: false; error: string } {
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, date: null }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Fecha inválida." }
  }

  return { ok: true, date }
}
