import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined }
type InputJsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue | undefined }

export type AuditActor = {
  usuarioId: number | null
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
  usuarioId: null,
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
    usuarioId: parseSessionUserId(session.user.id),
    nombre: session.user.nombre || session.user.email || "Usuario",
    email: session.user.email ?? null,
    rol: session.user.rol || "UNKNOWN",
  }
}

export async function getCompanySeatSnapshot(empresaId: number) {
  const [empresa, empleadosSuspendidos] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        asientos_contratados: true,
        asientos_usados: true,
      },
    }),
    prisma.empleado.count({
      where: {
        empresa_id: empresaId,
        activo: false,
      },
    }),
  ])

  if (!empresa) {
    return null
  }

  return {
    asientos_contratados: empresa.asientos_contratados,
    asientos_usados: empresa.asientos_usados,
    empleados_suspendidos: empleadosSuspendidos,
  } satisfies CompanySeatSnapshot
}

export async function createAuditEvent(input: {
  actor: AuditActor
  accion: string
  entidadTipo: string
  entidadId?: number | null
  empresaId?: number | null
  resumen: string
  metadata?: InputJsonValue
}) {
  try {
    await prisma.auditoriaEvento.create({
      data: {
        actor_usuario_id: input.actor.usuarioId,
        actor_nombre: input.actor.nombre,
        actor_email: input.actor.email,
        actor_rol: input.actor.rol,
        accion: input.accion,
        entidad_tipo: input.entidadTipo,
        entidad_id: input.entidadId ?? null,
        empresa_id: input.empresaId ?? null,
        resumen: input.resumen,
        metadata: input.metadata,
      },
    })
  } catch (error) {
    console.error("Audit event logging failed", {
      action: input.accion,
      entity: input.entidadTipo,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function createSeatHistoryEntry(input: {
  actor: AuditActor
  empresaId: number
  motivo: string
  detalle?: string | null
  before: CompanySeatSnapshot
  after: CompanySeatSnapshot
}) {
  try {
    await prisma.historialCupo.create({
      data: {
        empresa_id: input.empresaId,
        actor_usuario_id: input.actor.usuarioId,
        actor_nombre: input.actor.nombre,
        actor_email: input.actor.email,
        actor_rol: input.actor.rol,
        motivo: input.motivo,
        detalle: input.detalle ?? null,
        asientos_contratados_antes: input.before.asientos_contratados,
        asientos_contratados_despues: input.after.asientos_contratados,
        asientos_usados_antes: input.before.asientos_usados,
        asientos_usados_despues: input.after.asientos_usados,
        empleados_suspendidos: input.after.empleados_suspendidos,
      },
    })
  } catch (error) {
    console.error("Seat history logging failed", {
      companyId: input.empresaId,
      reason: input.motivo,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
