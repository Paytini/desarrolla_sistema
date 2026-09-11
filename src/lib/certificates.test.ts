import { describe, expect, it } from "vitest"
import { buildPendingCertificates } from "./certificates"

function buildEmployee(overrides: Partial<Parameters<typeof buildPendingCertificates>[0][number]> = {}) {
  return {
    id: "emp-1",
    first_name: "Ana",
    last_name: "Lopez",
    email: "ana@example.com",
    department: null,
    certificates: [],
    courses: [],
    ...overrides,
  }
}

function buildCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: "course-1",
    employee_id: "emp-1",
    wp_course_id: 1,
    course_name: "Curso",
    progress_pct: 100,
    completed: true,
    access_status: "ACTIVE",
    access_source: null,
    access_error: null,
    last_access_attempt: null,
    course_start_date: null,
    completed_at: new Date("2026-01-01"),
    last_synced_at: new Date("2026-01-01"),
    access_expires_at: null,
    ...overrides,
  }
}

describe("buildPendingCertificates", () => {
  it("lists a completed course without a certificate as pending", () => {
    const employee = buildEmployee({ courses: [buildCourse()] })
    const pending = buildPendingCertificates([employee])
    expect(pending).toHaveLength(1)
  })

  it("excludes courses marked as not granting DC-3", () => {
    const employee = buildEmployee({ courses: [buildCourse({ wp_course_id: 5 })] })
    const pending = buildPendingCertificates([employee], new Set([5]))
    expect(pending).toHaveLength(0)
  })

  it("does not exclude a course that isn't in the excluded set", () => {
    const employee = buildEmployee({ courses: [buildCourse({ wp_course_id: 5 })] })
    const pending = buildPendingCertificates([employee], new Set([99]))
    expect(pending).toHaveLength(1)
  })
})
