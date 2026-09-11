import { describe, expect, it } from "vitest"
import { getDc3MissingFields, type Dc3MetadataView } from "./fields"

function buildMetadata(overrides: Partial<Dc3MetadataView> = {}): Dc3MetadataView {
  return {
    wp_course_id: 1,
    course_name: "Curso",
    duration_hours: 8,
    subject_area_name: "Seguridad",
    subject_area_code: "SEG",
    training_agent_name: "Desarrolla360",
    training_agent_registration: "AC-001",
    instructor_name: "Ana Perez",
    instructor_signature_url: "https://example.com/firma.png",
    grants_dc3: true,
    source: "MANUAL",
    last_synced_at: null,
    ...overrides,
  }
}

describe("getDc3MissingFields", () => {
  it("returns no missing fields when everything required is present", () => {
    expect(getDc3MissingFields(buildMetadata())).toEqual([])
  })

  it("returns every missing field for undefined metadata", () => {
    expect(getDc3MissingFields(undefined)).toEqual([
      "duración",
      "área temática",
      "agente capacitador",
      "instructor",
      "firma",
    ])
  })

  it("flags only the fields that are actually missing", () => {
    const missing = getDc3MissingFields(
      buildMetadata({ instructor_signature_url: null, duration_hours: null }),
    )
    expect(missing).toEqual(["duración", "firma"])
  })

  it("treats duration_hours of 0 as missing", () => {
    const missing = getDc3MissingFields(buildMetadata({ duration_hours: 0 }))
    expect(missing).toContain("duración")
  })

  it("returns no missing fields when the course doesn't grant DC-3, regardless of other fields", () => {
    const missing = getDc3MissingFields(
      buildMetadata({ grants_dc3: false, duration_hours: null, instructor_signature_url: null }),
    )
    expect(missing).toEqual([])
  })
})
