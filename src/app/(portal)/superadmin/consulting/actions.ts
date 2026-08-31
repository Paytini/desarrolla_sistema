"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { getConsultingArea } from "@/lib/consulting/areas"
import {
  formatConsultingDateTime,
  isBusinessDayString,
  isTimeSlotValid,
} from "@/lib/consulting/schedule"
import { notifyCompanyHr } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { isUuid } from "@/lib/uuid"

function getRequestId(formData: FormData) {
  return String(formData.get("request_id") ?? "").trim()
}

export async function confirmConsultingRequestAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)
  const requestId = getRequestId(formData)
  const preferredDate = String(formData.get("preferred_date") ?? "").trim()
  const preferredTime = String(formData.get("preferred_time") ?? "").trim()

  if (
    !requestId ||
    !isUuid(requestId) ||
    !isBusinessDayString(preferredDate) ||
    !isTimeSlotValid(preferredTime)
  ) {
    redirect("/superadmin/consulting?error=solicitud")
  }

  const request = await prisma.consultingRequest.findFirst({
    where: { id: requestId, status: "PENDING" },
  })
  if (!request) redirect("/superadmin/consulting?error=solicitud")

  const originalDateKey = request.preferred_date.toISOString().slice(0, 10)
  const wasRescheduled =
    originalDateKey !== preferredDate || request.preferred_time !== preferredTime

  await prisma.consultingRequest.update({
    where: { id: requestId },
    data: {
      status: "CONFIRMED",
      preferred_date: new Date(`${preferredDate}T12:00:00.000Z`),
      preferred_time: preferredTime,
    },
  })

  const areaLabel = getConsultingArea(request.area)?.label ?? request.area
  const dateTimeLabel = formatConsultingDateTime(preferredDate, preferredTime)

  await createAuditEvent({
    actor,
    accion: "CONSULTORIA_CONFIRMADA",
    entityType: "CONSULTING_REQUEST",
    entityId: requestId,
    companyId: request.company_id,
    resumen: wasRescheduled
      ? `${actor.nombre} confirmó y reagendó la consultoría de ${areaLabel} para ${dateTimeLabel}.`
      : `${actor.nombre} confirmó la consultoría de ${areaLabel}.`,
  })

  await notifyCompanyHr(request.company_id, {
    tipo: "CONSULTORIA_CONFIRMADA",
    titulo: wasRescheduled
      ? "Tu consultoría fue reagendada y confirmada"
      : "Tu consultoría fue confirmada",
    mensaje: wasRescheduled
      ? `Tu sesión de ${areaLabel} quedó confirmada para el ${dateTimeLabel} (cambió el horario).`
      : `Tu sesión de ${areaLabel} fue confirmada para el ${dateTimeLabel}.`,
    entidadTipo: "CONSULTING_REQUEST",
    entidadId: requestId,
  })

  revalidatePath("/superadmin/consulting")
  redirect("/superadmin/consulting?success=solicitud_confirmada")
}

export async function cancelConsultingRequestAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)
  const requestId = getRequestId(formData)

  if (!requestId || !isUuid(requestId)) redirect("/superadmin/consulting?error=solicitud")

  const request = await prisma.consultingRequest.findFirst({
    where: { id: requestId, status: "PENDING" },
  })
  if (!request) redirect("/superadmin/consulting?error=solicitud")

  await prisma.consultingRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  })

  const areaLabel = getConsultingArea(request.area)?.label ?? request.area

  await createAuditEvent({
    actor,
    accion: "CONSULTORIA_CANCELADA",
    entityType: "CONSULTING_REQUEST",
    entityId: requestId,
    companyId: request.company_id,
    resumen: `${actor.nombre} canceló la consultoría de ${areaLabel}.`,
  })

  await notifyCompanyHr(request.company_id, {
    tipo: "CONSULTORIA_CANCELADA",
    titulo: "Tu consultoría fue cancelada",
    mensaje: `Tu sesión de ${areaLabel} fue cancelada por nuestro equipo.`,
    entidadTipo: "CONSULTING_REQUEST",
    entidadId: requestId,
  })

  revalidatePath("/superadmin/consulting")
  redirect("/superadmin/consulting?success=solicitud_cancelada")
}
