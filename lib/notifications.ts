import { prisma } from "@/lib/prisma"

type NotifyContent = {
  tipo: string
  titulo: string
  mensaje: string
  entidadTipo?: string
  entidadId?: number
}

async function createNotifications(usuarioIds: number[], content: NotifyContent) {
  if (usuarioIds.length === 0) return

  await prisma.notificacion.createMany({
    data: usuarioIds.map((usuario_id) => ({
      usuario_id,
      tipo: content.tipo,
      titulo: content.titulo,
      mensaje: content.mensaje,
      entidad_tipo: content.entidadTipo ?? null,
      entidad_id: content.entidadId ?? null,
    })),
  })
}

export async function notifySuperadmins(
  content: NotifyContent & { excludeUsuarioId?: number | null }
) {
  const superadmins = await prisma.usuario.findMany({
    where: {
      rol: "SUPERADMIN",
      activo: true,
      ...(content.excludeUsuarioId ? { id: { not: content.excludeUsuarioId } } : {}),
    },
    select: { id: true },
  })
  await createNotifications(superadmins.map((u) => u.id), content)
}

export async function notifyCompanyRH(companyId: number, content: NotifyContent) {
  const rhUsers = await prisma.usuario.findMany({
    where: { empresa_id: companyId, rol: "RH", activo: true },
    select: { id: true },
  })
  await createNotifications(rhUsers.map((u) => u.id), content)
}

export async function notifyUsuarioByEmail(email: string, content: NotifyContent) {
  const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true } })
  if (!usuario) return
  await createNotifications([usuario.id], content)
}

export async function notifyEmployeeNewCertificates(employeeId: number, courseTitles: string[]) {
  if (courseTitles.length === 0) return
  const employee = await prisma.empleado.findUnique({ where: { id: employeeId }, select: { email: true } })
  if (!employee) return

  const message =
    courseTitles.length === 1
      ? `Tu constancia DC-3 de "${courseTitles[0]}" ya está lista.`
      : `Tienes ${courseTitles.length} constancias DC-3 nuevas disponibles.`

  await notifyUsuarioByEmail(employee.email, {
    tipo: "CONSTANCIA_LISTA",
    titulo: "Constancia DC-3 lista",
    mensaje: message,
  })
}

const PACKAGE_EXPIRY_WARNING_DAYS = 30

export async function checkAndNotifyExpiringPackages() {
  const now = new Date()
  const threshold = new Date(now.getTime() + PACKAGE_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)

  const expiring = await prisma.empresaPaquete.findMany({
    where: {
      activo: true,
      fecha_vencimiento: { not: null, lte: threshold, gte: now },
    },
    select: {
      id: true,
      fecha_vencimiento: true,
      empresa: { select: { id: true, nombre: true } },
    },
  })

  for (const ep of expiring) {
    const alreadyNotified = await prisma.notificacion.findFirst({
      where: { tipo: "PAQUETE_POR_VENCER", entidad_id: ep.id },
      select: { id: true },
    })
    if (alreadyNotified) continue

    const days = Math.max(
      0,
      Math.ceil((ep.fecha_vencimiento!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    )
    const daysLabel = `${days} día${days === 1 ? "" : "s"}`

    await notifySuperadmins({
      tipo: "PAQUETE_POR_VENCER",
      titulo: "Paquete por vencer",
      mensaje: `El paquete de ${ep.empresa.nombre} vence en ${daysLabel}.`,
      entidadTipo: "EMPRESA_PAQUETE",
      entidadId: ep.id,
    })

    await notifyCompanyRH(ep.empresa.id, {
      tipo: "PAQUETE_POR_VENCER",
      titulo: "Tu paquete está por vencer",
      mensaje: `Tu paquete vence en ${daysLabel}. Contacta a soporte para renovarlo.`,
      entidadTipo: "EMPRESA_PAQUETE",
      entidadId: ep.id,
    })
  }
}

export async function getRecentNotifications(userId: number, limit = 20) {
  return prisma.notificacion.findMany({
    where: { usuario_id: userId },
    orderBy: { created_at: "desc" },
    take: limit,
  })
}

export async function getUnreadNotificationCount(userId: number) {
  return prisma.notificacion.count({
    where: { usuario_id: userId, leida: false },
  })
}

export async function markAllNotificationsRead(userId: number) {
  await prisma.notificacion.updateMany({
    where: { usuario_id: userId, leida: false },
    data: { leida: true },
  })
}
