import { prisma } from "@/lib/prisma"
import {
  createAuditEvent,
  createSeatHistoryEntry,
  getCompanySeatSnapshot,
  type AuditActor,
} from "@/lib/auditing"
import { bridgeDeleteEmployee, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

type DeleteEmployeeOptions = {
  employeeId: string
  companyId?: string
  actor?: AuditActor
  source?: "HR" | "SUPERADMIN" | "SYSTEM"
}

export async function deleteEmployeeRecord({
  employeeId,
  companyId,
  actor,
  source = "SYSTEM",
}: DeleteEmployeeOptions) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      ...(companyId ? { company_id: companyId } : {}),
    },
    select: {
      id: true,
      company_id: true,
      email: true,
      wp_user_id: true,
      first_name: true,
      last_name: true,
    },
  })

  if (!employee) {
    throw new Error("Empleado no encontrado")
  }

  const actingUser: AuditActor = actor ?? {
    userId: null,
    nombre: "Sistema",
    email: null,
    role: source,
  }
  const beforeSeatSnapshot = await getCompanySeatSnapshot(employee.company_id)
  const company = await prisma.company.findUnique({
    where: { id: employee.company_id },
    select: { name: true },
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
    const user = await tx.user.findFirst({
      where: {
        email: employee.email,
        company_id: employee.company_id,
        role: "EMPLOYEE",
      },
      select: { id: true },
    })

    if (user) {
      await tx.portalSession.deleteMany({
        where: { user_id: user.id },
      })

      await tx.user.delete({
        where: { id: user.id },
      })
    }

    await tx.certificate.deleteMany({
      where: { employee_id: employee.id },
    })

    await tx.employeeCourse.deleteMany({
      where: { employee_id: employee.id },
    })

    await tx.employee.delete({
      where: { id: employee.id },
    })

    const activeEmployees = await tx.employee.count({
      where: {
        company_id: employee.company_id,
        active: true,
      },
    })

    await tx.company.update({
      where: { id: employee.company_id },
      data: { used_seats: activeEmployees },
    })
  })

  const afterSeatSnapshot = await getCompanySeatSnapshot(employee.company_id)
  if (beforeSeatSnapshot && afterSeatSnapshot) {
    await createSeatHistoryEntry({
      actor: actingUser,
      companyId: employee.company_id,
      motivo: "empleado_eliminado",
      detalle: `${employee.first_name} ${employee.last_name} (${employee.email})`,
      before: beforeSeatSnapshot,
      after: afterSeatSnapshot,
    })
  }

  await createAuditEvent({
    actor: actingUser,
    accion: "EMPLEADO_ELIMINADO",
    entityType: "EMPLEADO",
    entityId: employee.id,
    companyId: employee.company_id,
    resumen: `${actingUser.nombre} elimino al empleado ${employee.first_name} ${employee.last_name} de ${company?.name ?? "la empresa"}.`,
    metadata: {
      email: employee.email,
      source,
    },
  })

  return employee
}

export async function togglePortalUserStatus(
  userId: string,
  callerRole: "SUPERADMIN" | "HR" | "SYSTEM" = "SYSTEM"
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      active: true,
      role: true,
    },
  })

  if (!user) {
    throw new Error("Usuario no encontrado")
  }

  if (user.role === "SUPERADMIN" && callerRole !== "SUPERADMIN") {
    throw new Error("No autorizado para modificar una cuenta de SUPERADMIN")
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  })

  return user
}

export async function revokeUserPortalSessions(userId: string) {
  return prisma.portalSession.deleteMany({
    where: { user_id: userId },
  })
}

export async function revokePortalSession(sessionId: string) {
  return prisma.portalSession.deleteMany({
    where: { id: sessionId },
  })
}

export async function purgeExpiredPortalSessions() {
  return prisma.portalSession.deleteMany({
    where: {
      expires_at: {
        lt: new Date(),
      },
    },
  })
}
