import { prisma } from "@/lib/prisma"
import { enqueueEmailSendJob } from "@/lib/jobs"
import { buildCertificateReadyEmail } from "@/lib/email-templates/certificate-ready"
import { buildPackageExpiringEmail } from "@/lib/email-templates/package-expiring"

type NotifyContent = {
  tipo: string
  titulo: string
  mensaje: string
  entidadTipo?: string
  entidadId?: string
}

async function createNotifications(usuarioIds: string[], content: NotifyContent) {
  if (usuarioIds.length === 0) return

  await prisma.notification.createMany({
    data: usuarioIds.map((user_id) => ({
      user_id,
      type: content.tipo,
      title: content.titulo,
      message: content.mensaje,
      entity_type: content.entidadTipo ?? null,
      entity_id: content.entidadId ?? null,
    })),
  })
}

export async function notifySuperadmins(
  content: NotifyContent & { excludeUsuarioId?: string | null },
) {
  const superadmins = await prisma.user.findMany({
    where: {
      role: "SUPERADMIN",
      active: true,
      ...(content.excludeUsuarioId ? { id: { not: content.excludeUsuarioId } } : {}),
    },
    select: { id: true },
  })
  await createNotifications(
    superadmins.map((u) => u.id),
    content,
  )
}

export async function notifyCompanyHr(companyId: string, content: NotifyContent) {
  const hrUsers = await prisma.user.findMany({
    where: { company_id: companyId, role: "HR", active: true },
    select: { id: true },
  })
  await createNotifications(
    hrUsers.map((u) => u.id),
    content,
  )
}

export async function notifyUsuarioByEmail(email: string, content: NotifyContent) {
  const usuario = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!usuario) return
  await createNotifications([usuario.id], content)
}

export async function notifyEmployeeNewCertificates(
  employeeId: string,
  certificates: { courseName: string; certificateUrl: string }[],
) {
  if (certificates.length === 0) return
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { email: true, first_name: true, last_name: true },
  })
  if (!employee) return

  const message =
    certificates.length === 1
      ? `Tu constancia DC-3 de "${certificates[0].courseName}" ya está lista.`
      : `Tienes ${certificates.length} constancias DC-3 nuevas disponibles.`

  await notifyUsuarioByEmail(employee.email, {
    tipo: "CONSTANCIA_LISTA",
    titulo: "Constancia DC-3 lista",
    mensaje: message,
  })

  try {
    const { subject, html, text } = await buildCertificateReadyEmail({
      employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
      certificates,
    })
    await enqueueEmailSendJob({ to: employee.email, subject, html, text })
  } catch (error) {
    console.error("No se pudo enviar el correo de constancia lista", {
      employeeId,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

const PACKAGE_EXPIRY_WARNING_DAYS = 30

export async function checkAndNotifyExpiringPackages() {
  const now = new Date()
  const threshold = new Date(now.getTime() + PACKAGE_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)

  const expiring = await prisma.companyPackage.findMany({
    where: {
      active: true,
      expiration_date: { not: null, lte: threshold, gte: now },
    },
    select: {
      id: true,
      expiration_date: true,
      company: {
        select: {
          id: true,
          name: true,
          users: {
            where: { role: "HR", active: true },
            select: { name: true, email: true },
          },
        },
      },
    },
  })

  for (const ep of expiring) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: { type: "PAQUETE_POR_VENCER", entity_id: ep.id },
      select: { id: true },
    })
    if (alreadyNotified) continue

    const days = Math.max(
      0,
      Math.ceil((ep.expiration_date!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    )
    const daysLabel = `${days} día${days === 1 ? "" : "s"}`

    await notifySuperadmins({
      tipo: "PAQUETE_POR_VENCER",
      titulo: "Paquete por vencer",
      mensaje: `El paquete de ${ep.company.name} vence en ${daysLabel}.`,
      entidadTipo: "EMPRESA_PAQUETE",
      entidadId: ep.id,
    })

    await notifyCompanyHr(ep.company.id, {
      tipo: "PAQUETE_POR_VENCER",
      titulo: "Tu paquete está por vencer",
      mensaje: `Tu paquete vence en ${daysLabel}. Contacta a soporte para renovarlo.`,
      entidadTipo: "EMPRESA_PAQUETE",
      entidadId: ep.id,
    })

    for (const hrUser of ep.company.users) {
      try {
        const { subject, html, text } = await buildPackageExpiringEmail({
          nombreHr: hrUser.name,
          nombreEmpresa: ep.company.name,
          daysLabel,
        })
        await enqueueEmailSendJob({ to: hrUser.email, subject, html, text })
      } catch (error) {
        console.error("No se pudo enviar el correo de paquete por vencer", {
          companyPackageId: ep.id,
          hrEmail: hrUser.email,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
}

export async function getNotificationHistory(
  userId: string,
  options: { cursor?: string; limit?: number; unreadOnly?: boolean; archived?: boolean } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)

  const items = await prisma.notification.findMany({
    where: {
      user_id: userId,
      archived: options.archived ?? false,
      ...(options.unreadOnly ? { read: false } : {}),
    },
    orderBy: { created_at: "desc" },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  })

  const hasMore = items.length > limit
  return {
    items: hasMore ? items.slice(0, limit) : items,
    nextCursor: hasMore ? items[limit].id : null,
  }
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { user_id: userId, read: false, archived: false },
  })
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { user_id: userId, read: false },
    data: { read: true },
  })
}

export async function setNotificationArchived(userId: string, id: string, archived: boolean) {
  await prisma.notification.updateMany({
    where: { id, user_id: userId },
    data: { archived },
  })
}
