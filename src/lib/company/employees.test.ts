import { describe, expect, it } from "vitest"
import { validateEmployeeEdit } from "./employees"

describe("validateEmployeeEdit", () => {
  it("acepta nombre y apellido presentes sin CURP", () => {
    expect(validateEmployeeEdit({ nombre: "Ana", apellido: "López", curp: "" })).toEqual({
      ok: true,
    })
  })

  it("acepta una CURP de 18 caracteres", () => {
    expect(
      validateEmployeeEdit({ nombre: "Ana", apellido: "López", curp: "LOPA900101MDFRNN08" }).ok,
    ).toBe(true)
  })

  it("rechaza sin nombre", () => {
    const r = validateEmployeeEdit({ nombre: "  ", apellido: "López", curp: "" })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/nombre/i)
  })

  it("rechaza sin apellido", () => {
    const r = validateEmployeeEdit({ nombre: "Ana", apellido: "", curp: "" })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/apellido/i)
  })

  it("rechaza una CURP con longitud distinta de 18", () => {
    const r = validateEmployeeEdit({ nombre: "Ana", apellido: "López", curp: "ABC123" })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toContain("18")
  })
})
