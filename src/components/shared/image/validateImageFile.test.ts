import { describe, expect, it } from "vitest"
import { validateImageFile } from "./validateImageFile"

const ACCEPT = ["image/png", "image/jpeg", "image/webp"]
const MAX = 2 * 1024 * 1024

function fileOf(type: string, size: number) {
  return new File([new Uint8Array(size)], "x", { type })
}

describe("validateImageFile", () => {
  it("acepta un tipo permitido dentro del límite", () => {
    expect(validateImageFile(fileOf("image/png", 1024), { accept: ACCEPT, maxSizeBytes: MAX })).toEqual({
      ok: true,
    })
  })

  it("rechaza un tipo no permitido y nombra los formatos válidos", () => {
    const result = validateImageFile(fileOf("image/gif", 1024), {
      accept: ACCEPT,
      maxSizeBytes: MAX,
    })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/PNG.*JPEG.*WEBP/)
  })

  it("rechaza un archivo que supera el límite e indica los MB", () => {
    const result = validateImageFile(fileOf("image/png", MAX + 1), {
      accept: ACCEPT,
      maxSizeBytes: MAX,
    })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toContain("2 MB")
  })

  it("acepta un archivo exactamente en el límite", () => {
    expect(
      validateImageFile(fileOf("image/png", MAX), { accept: ACCEPT, maxSizeBytes: MAX }).ok,
    ).toBe(true)
  })
})
