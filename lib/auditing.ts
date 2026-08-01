import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined }
type InputJsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue | undefined }

export type AuditActor = {
  userId: number | null
  nombre: string
  email: string | null
  rol: string
}

export type CompanySeatSnapshot = {
  asientos_contratados: number
  asientos_usados: number
  empleados_suspendidos: number
}

const SYSTEM_ACTOR: AuditActor = {
  userId: null,
  nombre: "Sistema",
  email: null,
  rol: "SYSTEM",
}

function parseSessionUserId(value: string | undefined | null) {
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

export function getAuditActorFromSession(session: Session | null | undefined): AuditActor {
  if (!session?.user) {
    return SYSTEM_ACTOR
  }

  return {
    userId: parseSessionUserId(session.user.id),
    nombre: session.user.nombre || session.user.email || "Usuario",
    email: session.user.email ?? null,
    rol: session.user.rol || "UNKNOWN",
  }
}

export async function getCompanySeatSnapshot(companyId: number) {
  const [company, suspendedEmployees] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        contracted_seats: true,
        used_seats: true,
      },
    }),
    prisma.employee.count({
      where: {
        company_id: companyId,
        active: false,
      },
    }),
  ])

  if (!company) {
    return null
  }

  return {
    asientos_contratados: company.contracted_seats,
    asientos_usados: company.used_seats,
    empleados_suspendidos: suspendedEmployees,
  } satisfies CompanySeatSnapshot
}

export async function createAuditEvent(input: {
  actor: AuditActor
  accion: string
  entityType: string
  entityId?: number | null
  companyId?: number | null
  resumen: string
  metadata?: InputJsonValue
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        actor_user_id: input.actor.userId,
        actor_name: input.actor.nombre,
        actor_email: input.actor.email,
        actor_role: input.actor.rol,
        action: input.accion,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        company_id: input.companyId ?? null,
        summary: input.resumen,
        metadata: input.metadata,
      },
    })
  } catch (error) {
    console.error("Audit event logging failed", {
      action: input.accion,
      entity: input.entityType,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function createSeatHistoryEntry(input: {
  actor: AuditActor
  companyId: number
  motivo: string
  detalle?: string | null
  before: CompanySeatSnapshot
  after: CompanySeatSnapshot
}) {
  try {
    await prisma.seatHistory.create({
      data: {
        company_id: input.companyId,
        actor_user_id: input.actor.userId,
        actor_name: input.actor.nombre,
        actor_email: input.actor.email,
        actor_role: input.actor.rol,
        reason: input.motivo,
        detail: input.detalle ?? null,
        contracted_seats_before: input.before.asientos_contratados,
        contracted_seats_after: input.after.asientos_contratados,
        used_seats_before: input.before.asientos_usados,
        used_seats_after: input.after.asientos_usados,
        suspended_employees: input.after.empleados_suspendidos,
      },
    })
  } catch (error) {
    console.error("Seat history logging failed", {
      companyId: input.companyId,
      reason: input.motivo,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
