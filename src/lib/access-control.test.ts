import type { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended"

vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<PrismaClient>(),
}))

vi.mock("@/lib/auditing", () => ({
  createAuditEvent: vi.fn(),
  createSeatHistoryEntry: vi.fn(),
  getCompanySeatSnapshot: vi.fn(),
}))

vi.mock("@/lib/wordpress/bridge", () => ({
  isWordPressBridgeConfigured: vi.fn(),
  bridgeDeleteEmployee: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { createAuditEvent, createSeatHistoryEntry, getCompanySeatSnapshot } from "@/lib/auditing"
import { bridgeDeleteEmployee, isWordPressBridgeConfigured } from "@/lib/wordpress/bridge"
import {
  deleteEmployeeRecord,
  toggleEmployeeStatus,
  togglePortalUserStatus,
} from "./access-control"

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

const SEAT_SNAPSHOT = { asientos_contratados: 10, asientos_usados: 3, empleados_suspendidos: 1 }

function baseEmployee(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "employee-1",
    company_id: "company-1",
    active: true,
    email: "empleado@example.com",
    first_name: "Ana",
    last_name: "Perez",
    wp_user_id: 42,
    ...overrides,
  }
}

beforeEach(() => {
  mockReset(prismaMock)
  prismaMock.$transaction.mockImplementation((fn: unknown) =>
    (fn as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock),
  )

  vi.mocked(createAuditEvent).mockReset().mockResolvedValue(undefined)
  vi.mocked(createSeatHistoryEntry).mockReset().mockResolvedValue(undefined)
  vi.mocked(getCompanySeatSnapshot).mockReset().mockResolvedValue(SEAT_SNAPSHOT)
  vi.mocked(isWordPressBridgeConfigured).mockReset().mockReturnValue(false)
  vi.mocked(bridgeDeleteEmployee).mockReset()
})

describe("toggleEmployeeStatus", () => {
  it("suspends an active employee, mirrors it to the portal user, and recalculates seats", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.employee.count.mockResolvedValue(2)

    const result = await toggleEmployeeStatus({ employeeId: "employee-1", source: "HR" })

    expect(result.active).toBe(true) // returns the employee as it was *before* the toggle
    expect(prismaMock.employee.update).toHaveBeenCalledWith({
      where: { id: "employee-1" },
      data: { active: false },
    })
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { email: "empleado@example.com", company_id: "company-1" },
      data: { active: false },
    })
    expect(prismaMock.company.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { used_seats: 2 },
    })
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "EMPLEADO_SUSPENDIDO" }),
    )
    expect(createSeatHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: "empleado_suspendido" }),
    )
  })

  it("reactivates a suspended employee", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee({ active: false }) as never)
    prismaMock.employee.count.mockResolvedValue(4)

    await toggleEmployeeStatus({ employeeId: "employee-1" })

    expect(prismaMock.employee.update).toHaveBeenCalledWith({
      where: { id: "employee-1" },
      data: { active: true },
    })
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "EMPLEADO_REACTIVADO" }),
    )
    expect(createSeatHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: "empleado_reactivado" }),
    )
  })

  it("throws when no employee matches, without touching seats or audit", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(null)

    await expect(toggleEmployeeStatus({ employeeId: "missing" })).rejects.toThrow(
      "Empleado no encontrado",
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(createAuditEvent).not.toHaveBeenCalled()
  })

  it("scopes the lookup by companyId when one is provided", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.employee.count.mockResolvedValue(1)

    await toggleEmployeeStatus({ employeeId: "employee-1", companyId: "company-1" })

    expect(prismaMock.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "employee-1", company_id: "company-1" }),
      }),
    )
  })
})

describe("deleteEmployeeRecord", () => {
  it("deletes the employee, the linked portal user, and dependent rows, then recalculates seats", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.company.findUnique.mockResolvedValue({ name: "Acme" } as never)
    prismaMock.user.findFirst.mockResolvedValue({ id: "user-1" } as never)
    prismaMock.employee.count.mockResolvedValue(1)

    const result = await deleteEmployeeRecord({ employeeId: "employee-1", source: "HR" })

    expect(result.id).toBe("employee-1")
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
      where: { user_id: "user-1" },
    })
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } })
    expect(prismaMock.certificate.deleteMany).toHaveBeenCalledWith({
      where: { employee_id: "employee-1" },
    })
    expect(prismaMock.employee.delete).toHaveBeenCalledWith({ where: { id: "employee-1" } })
    expect(prismaMock.company.update).toHaveBeenCalledWith({
      where: { id: "company-1" },
      data: { used_seats: 1 },
    })
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "EMPLEADO_ELIMINADO" }),
    )
  })

  it("skips deleting a portal user when the employee never had one", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.company.findUnique.mockResolvedValue({ name: "Acme" } as never)
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.employee.count.mockResolvedValue(0)

    await deleteEmployeeRecord({ employeeId: "employee-1" })

    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it("throws when no employee matches", async () => {
    prismaMock.employee.findFirst.mockResolvedValue(null)

    await expect(deleteEmployeeRecord({ employeeId: "missing" })).rejects.toThrow(
      "Empleado no encontrado",
    )
  })

  it("deletes locally without calling the bridge when it isn't configured", async () => {
    vi.mocked(isWordPressBridgeConfigured).mockReturnValue(false)
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.company.findUnique.mockResolvedValue({ name: "Acme" } as never)
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.employee.count.mockResolvedValue(0)

    await deleteEmployeeRecord({ employeeId: "employee-1" })

    expect(bridgeDeleteEmployee).not.toHaveBeenCalled()
    expect(prismaMock.employee.delete).toHaveBeenCalled()
  })

  it("deletes locally when the bridge is configured and confirms deletion", async () => {
    vi.mocked(isWordPressBridgeConfigured).mockReturnValue(true)
    vi.mocked(bridgeDeleteEmployee).mockResolvedValue({
      found: true,
      deleted: true,
      wp_user_id: 42,
      email: "empleado@example.com",
      enrollment_posts_deleted: 0,
    })
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.company.findUnique.mockResolvedValue({ name: "Acme" } as never)
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.employee.count.mockResolvedValue(0)

    await deleteEmployeeRecord({ employeeId: "employee-1" })

    expect(bridgeDeleteEmployee).toHaveBeenCalledWith({
      employeeId: "employee-1",
      wpUserId: 42,
      email: "empleado@example.com",
    })
    expect(prismaMock.employee.delete).toHaveBeenCalled()
  })

  it("aborts without deleting locally when the bridge fails to delete a known WordPress user", async () => {
    vi.mocked(isWordPressBridgeConfigured).mockReturnValue(true)
    vi.mocked(bridgeDeleteEmployee).mockResolvedValue({
      found: true,
      deleted: false,
      wp_user_id: 42,
      email: "empleado@example.com",
      enrollment_posts_deleted: 0,
    })
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.company.findUnique.mockResolvedValue({ name: "Acme" } as never)

    await expect(deleteEmployeeRecord({ employeeId: "employee-1" })).rejects.toThrow(
      "No fue posible eliminar al empleado en WordPress/Tutor LMS",
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.employee.delete).not.toHaveBeenCalled()
  })

  it("proceeds with the local deletion when the bridge never had that user in the first place", async () => {
    vi.mocked(isWordPressBridgeConfigured).mockReturnValue(true)
    vi.mocked(bridgeDeleteEmployee).mockResolvedValue({
      found: false,
      deleted: false,
      wp_user_id: null,
      email: null,
      enrollment_posts_deleted: 0,
    })
    prismaMock.employee.findFirst.mockResolvedValue(baseEmployee() as never)
    prismaMock.company.findUnique.mockResolvedValue({ name: "Acme" } as never)
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.employee.count.mockResolvedValue(0)

    await deleteEmployeeRecord({ employeeId: "employee-1" })

    expect(prismaMock.employee.delete).toHaveBeenCalled()
  })
})

describe("togglePortalUserStatus", () => {
  it("flips the active flag of a regular user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      active: true,
      role: "HR",
    } as never)

    const result = await togglePortalUserStatus("user-1", "SUPERADMIN")

    expect(result.active).toBe(true) // returns the user as it was *before* the toggle
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { active: false },
    })
  })

  it("throws when no user matches", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await expect(togglePortalUserStatus("missing")).rejects.toThrow("Usuario no encontrado")
  })

  it("refuses a non-SUPERADMIN caller trying to toggle a SUPERADMIN account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      active: true,
      role: "SUPERADMIN",
    } as never)

    await expect(togglePortalUserStatus("user-1", "HR")).rejects.toThrow(
      "No autorizado para modificar una cuenta de SUPERADMIN",
    )
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("allows a SUPERADMIN caller to toggle another SUPERADMIN account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      active: true,
      role: "SUPERADMIN",
    } as never)

    await togglePortalUserStatus("user-1", "SUPERADMIN")

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { active: false },
    })
  })
})
