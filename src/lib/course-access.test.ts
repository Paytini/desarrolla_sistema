import { describe, expect, it } from "vitest"
import { isCourseAccessExpired, parseAccessDeadlineInput } from "./course-access"

describe("isCourseAccessExpired", () => {
  const now = new Date("2026-09-11T00:00:00.000Z")

  it("returns false when there is no deadline", () => {
    expect(isCourseAccessExpired({ access_expires_at: null, completed: false }, now)).toBe(false)
  })

  it("returns false when the deadline is in the future", () => {
    const future = new Date("2026-09-12T00:00:00.000Z")
    expect(isCourseAccessExpired({ access_expires_at: future, completed: false }, now)).toBe(
      false,
    )
  })

  it("returns true when the deadline already passed and the course isn't completed", () => {
    const past = new Date("2026-09-10T00:00:00.000Z")
    expect(isCourseAccessExpired({ access_expires_at: past, completed: false }, now)).toBe(true)
  })

  it("returns false when the deadline passed but the course is already completed", () => {
    const past = new Date("2026-09-10T00:00:00.000Z")
    expect(isCourseAccessExpired({ access_expires_at: past, completed: true }, now)).toBe(false)
  })
})

describe("parseAccessDeadlineInput", () => {
  it("returns a null date when the input is empty (clears the deadline)", () => {
    expect(parseAccessDeadlineInput("")).toEqual({ ok: true, date: null })
  })

  it("parses a valid date string", () => {
    const result = parseAccessDeadlineInput("2026-12-31")
    expect(result.ok).toBe(true)
    expect(result.ok && result.date?.toISOString().slice(0, 10)).toBe("2026-12-31")
  })

  it("rejects an invalid date string", () => {
    const result = parseAccessDeadlineInput("no-es-una-fecha")
    expect(result).toEqual({ ok: false, error: "Fecha inválida." })
  })
})
