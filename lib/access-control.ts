import { prisma } from "@/lib/prisma"
import { bridgeDeleteEmployee, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

type DeleteEmployeeOptions = {
  empleadoId: number
  empresaId?: number
}

export async function deleteEmployeeRecord({ empleadoId, empresaId }: DeleteEmployeeOptions) {
  const empleado = await prisma.empleado.findFirst({
    where: {
      id: empleadoId,
      ...(empresaId ? { empresa_id: empresaId } : {}),
    },
    select: {
      id: true,
      empresa_id: true,
      email: true,
      wp_user_id: true,
    },
  })

  if (!empleado) {
    throw new Error("Empleado no encontrado")
  }

  if (isWordPressBridgeConfigured()) {
    const bridgeResponse = await bridgeDeleteEmployee({
      employeeId: empleado.id,
      wpUserId: empleado.wp_user_id,
      email: empleado.email,
    })

    if (!bridgeResponse.deleted && bridgeResponse.found) {
      throw new Error("No fue posible eliminar al empleado en WordPress/Tutor LMS")
    }
  }

  await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findFirst({
      where: {
        email: empleado.email,
        empresa_id: empleado.empresa_id,
        rol: "EMPLEADO",
      },
      select: { id: true },
    })

    if (usuario) {
      await tx.sesionPortal.deleteMany({
        where: { usuario_id: usuario.id },
      })

      await tx.usuario.delete({
        where: { id: usuario.id },
      })
    }

    await tx.constancia.deleteMany({
      where: { empleado_id: empleado.id },
    })

    await tx.empleadoCurso.deleteMany({
      where: { empleado_id: empleado.id },
    })

    await tx.empleado.delete({
      where: { id: empleado.id },
    })

    const activeEmployees = await tx.empleado.count({
      where: {
        empresa_id: empleado.empresa_id,
        activo: true,
      },
    })

    await tx.empresa.update({
      where: { id: empleado.empresa_id },
      data: { asientos_usados: activeEmployees },
    })
  })

  return empleado
}

export async function togglePortalUserStatus(userId: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      activo: true,
      rol: true,
    },
  })

  if (!usuario) {
    throw new Error("Usuario no encontrado")
  }

  await prisma.usuario.update({
    where: { id: userId },
    data: { activo: !usuario.activo },
  })

  return usuario
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
