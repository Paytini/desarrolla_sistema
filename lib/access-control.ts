import { prisma } from "@/lib/prisma"
import {
  createAuditEvent,
  createSeatHistoryEntry,
  getCompanySeatSnapshot,
  type AuditActor,
} from "@/lib/auditing"
import { bridgeDeleteEmployee, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

type DeleteEmployeeOptions = {
  employeeId: number
  companyId?: number
  actor?: AuditActor
  source?: "RH" | "SUPERADMIN" | "SYSTEM"
}

export async function deleteEmployeeRecord({
  employeeId,
  companyId,
  actor,
  source = "SYSTEM",
}: DeleteEmployeeOptions) {
  const employee = await prisma.empleado.findFirst({
    where: {
      id: employeeId,
      ...(companyId ? { empresa_id: companyId } : {}),
    },
    select: {
      id: true,
      empresa_id: true,
      email: true,
      wp_user_id: true,
      nombre: true,
      apellido: true,
    },
  })

  if (!employee) {
    throw new Error("Empleado no encontrado")
  }

  const actingUser: AuditActor = actor ?? {
    usuarioId: null,
    nombre: "Sistema",
    email: null,
    rol: source,
  }
  const beforeSeatSnapshot = await getCompanySeatSnapshot(employee.empresa_id)
  const company = await prisma.empresa.findUnique({
    where: { id: employee.empresa_id },
    select: { nombre: true },
  })

  if (isWordPressBridgeConfigured()) {
    const bridgeResponse = await bridgeDeleteEmployee({
      employeeId: employee.id,
      wpUserId: employee.wp_user_id,
      email: employee.email,
    })

    if (!bridgeResponse.deleted && bridgeResponse.found) {
      throw new Error("No fue posible eliminar al empleado en WordPress/Tutor LMS")
    }
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.usuario.findFirst({
      where: {
        email: employee.email,
        empresa_id: employee.empresa_id,
        rol: "EMPLEADO",
      },
      select: { id: true },
    })

    if (user) {
      await tx.sesionPortal.deleteMany({
        where: { usuario_id: user.id },
      })

      await tx.usuario.delete({
        where: { id: user.id },
      })
    }

    await tx.constancia.deleteMany({
      where: { empleado_id: employee.id },
    })

    await tx.empleadoCurso.deleteMany({
      where: { empleado_id: employee.id },
    })

    await tx.empleado.delete({
      where: { id: employee.id },
    })

    const activeEmployees = await tx.empleado.count({
      where: {
        empresa_id: employee.empresa_id,
        activo: true,
      },
    })

    await tx.empresa.update({
      where: { id: employee.empresa_id },
      data: { asientos_usados: activeEmployees },
    })
  })

  const afterSeatSnapshot = await getCompanySeatSnapshot(employee.empresa_id)
  if (beforeSeatSnapshot && afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor: actingUser,
      empresaId: employee.empresa_id,
      motivo: "empleado_eliminado",
      detalle: `${employee.nombre} ${employee.apellido} (${employee.email})`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor: actingUser,
    accion: "EMPLEADO_ELIMINADO",
    entidadTipo: "EMPLEADO",
    entidadId: employee.id,
    empresaId: employee.empresa_id,
    resumen: `${actingUser.nombre} elimino al empleado ${employee.nombre} ${employee.apellido} de ${company?.nombre ?? "la empresa"}.`,
    metadata: {
      email: employee.email,
      source,
    },
  })

  return employee
}

export async function togglePortalUserStatus(
  userId: number,
  callerRole: "SUPERADMIN" | "RH" | "SYSTEM" = "SYSTEM"
) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      activo: true,
      rol: true,
    },
  })

  if (!user) {
    throw new Error("Usuario no encontrado")
  }

  if (user.rol === "SUPERADMIN" && callerRole !== "SUPERADMIN") {
    throw new Error("No autorizado para modificar una cuenta de SUPERADMIN")
  }

  await prisma.usuario.update({
    where: { id: userId },
    data: { activo: !user.activo },
  })

  return user
}

export async function revokeUserPortalSessions(userId: number) {
  return prisma.sesionPortal.deleteMany({
    where: { usuario_id: userId },
  })
}

export async function revokePortalSession(sessionId: number) {
  return prisma.sesionPortal.deleteMany({
    where: { id: sessionId },
  })
}

export async function purgeExpiredPortalSessions() {
  return prisma.sesionPortal.deleteMany({
    where: {
      expira_en: {
        lt: new Date(),
      },
    },
  })
}
