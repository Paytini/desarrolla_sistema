import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined }
type InputJsonValue =
  string | number | boolean | JsonValue[] | { [key: string]: JsonValue | undefined }

export type AuditActor = {
  userId: string | null
  nombre: string
  email: string | null
  role: string
}

export type CompanySeatSnapshot = {
  asientos_contratados: number
  asientos_usados: number
  empleados_suspendidos: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SYSTEM_ACTOR: AuditActor = {
  userId: null,
  nombre: "Sistema",
  email: null,
  role: "SYSTEM",
}

function parseSessionUserId(value: string | undefined | null) {
  if (!value) return null

  return UUID_RE.test(value) ? value : null
}

export function getAuditActorFromSession(session: Session | null | undefined): AuditActor {
  if (!session?.user) {
    return SYSTEM_ACTOR
  }

  return {
    userId: parseSessionUserId(session.user.id),
    nombre: session.user.nombre || session.user.email || "Usuario",
    email: session.user.email ?? null,
    role: session.user.role || "UNKNOWN",
  }
}

export async function getCompanySeatSnapshot(companyId: string) {
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
  entityId?: string | null
  companyId?: string | null
  resumen: string
  metadata?: InputJsonValue
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        actor_user_id: input.actor.userId,
        actor_name: input.actor.nombre,
        actor_email: input.actor.email,
        actor_role: input.actor.role,
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
  companyId: string
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
        actor_role: input.actor.role,
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
