import { describe, expect, it } from "vitest"
import {
  assertAccessConfirmationSucceeded,
  assertEnrollmentSucceeded,
  assertStudentHasCourses,
  type BridgeEnrollmentResponse,
  type BridgeEnsureAccessResponse,
} from "./bridge"

describe("assertEnrollmentSucceeded", () => {
  it("does not throw when every requested course was enrolled", () => {
    const response: BridgeEnrollmentResponse = {
      user_id: 1,
      enrolled_course_ids: [101, 102],
      failed_course_ids: [],
    }
    expect(() => assertEnrollmentSucceeded(response, [101, 102])).not.toThrow()
  })

  it("throws with the bridge's own message for a course it reports as failed", () => {
    const response: BridgeEnrollmentResponse = {
      user_id: 1,
      enrolled_course_ids: [],
      failed_course_ids: [{ course_id: 101, message: "Enrollment create failed" }],
    }
    expect(() => assertEnrollmentSucceeded(response, [101])).toThrow(
      "Curso 101: Enrollment create failed",
    )
  })

  it("throws when a requested course is silently missing from both lists", () => {
    const response: BridgeEnrollmentResponse = {
      user_id: 1,
      enrolled_course_ids: [101],
      failed_course_ids: [],
    }
    expect(() => assertEnrollmentSucceeded(response, [101, 102])).toThrow(
      "Curso 102: Tutor LMS no confirmo la inscripcion",
    )
  })
})

describe("assertAccessConfirmationSucceeded", () => {
  it("does not throw when courses are either completed or already active", () => {
    const response: BridgeEnsureAccessResponse = {
      student_id: 1,
      completed_course_ids: [101],
      already_active_ids: [102],
      failed_course_ids: [],
    }
    expect(() => assertAccessConfirmationSucceeded(response, [101, 102])).not.toThrow()
  })

  it("throws when a requested course is missing from every list", () => {
    const response: BridgeEnsureAccessResponse = {
      student_id: 1,
      completed_course_ids: [],
      already_active_ids: [],
      failed_course_ids: [],
    }
    expect(() => assertAccessConfirmationSucceeded(response, [101])).toThrow(
      "Curso 101: no se pudo confirmar acceso academico",
    )
  })
})

describe("assertStudentHasCourses", () => {
  it("does not throw when every required course is visible to the student", () => {
    const response = {
      student_id: 1,
      raw: null,
      courses: [
        { wp_course_id: 101, title: "A", progress_pct: 0, completed: false },
        { wp_course_id: 102, title: "B", progress_pct: 0, completed: false },
      ],
    }
    expect(() => assertStudentHasCourses(response, [101, 102])).not.toThrow()
  })

  it("throws listing the course ids that never became visible", () => {
    const response = {
      student_id: 1,
      raw: null,
      courses: [{ wp_course_id: 101, title: "A", progress_pct: 0, completed: false }],
    }
    expect(() => assertStudentHasCourses(response, [101, 102])).toThrow(
      "Los cursos no quedaron visibles para el alumno en Tutor LMS: 102",
    )
  })
})
