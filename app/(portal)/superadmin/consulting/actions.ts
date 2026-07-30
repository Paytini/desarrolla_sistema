"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { getConsultingArea } from "@/lib/consulting-areas"
import { notifyCompanyRH } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

function getRequestId(formData: FormData) {
  return Number.parseInt(String(formData.get("request_id") ?? "0"), 10)
}

export async function confirmConsultingRequestAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)
  const requestId = getRequestId(formData)

  if (!requestId) redirect("/superadmin/consulting?error=solicitud")

  const request = await prisma.consultingRequest.findFirst({
    where: { id: requestId, status: "PENDING" },
  })
  if (!request) redirect("/superadmin/consulting?error=solicitud")

  await prisma.consultingRequest.update({
    where: { id: requestId },
    data: { status: "CONFIRMED" },
  })

  const areaLabel = getConsultingArea(request.area)?.label ?? request.area

  await createAuditEvent({
    actor,
    accion: "CONSULTORIA_CONFIRMADA",
    entityType: "CONSULTING_REQUEST",
    entityId: requestId,
    companyId: request.company_id,
    resumen: `${actor.nombre} confirmó la consultoría de ${areaLabel}.`,
  })

  await notifyCompanyRH(request.company_id, {
    tipo: "CONSULTORIA_CONFIRMADA",
    titulo: "Tu consultoría fue confirmada",
    mensaje: `Tu sesión de ${areaLabel} fue confirmada por nuestro equipo.`,
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

  if (!requestId) redirect("/superadmin/consulting?error=solicitud")

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

  await notifyCompanyRH(request.company_id, {
    tipo: "CONSULTORIA_CANCELADA",
    titulo: "Tu consultoría fue cancelada",
    mensaje: `Tu sesión de ${areaLabel} fue cancelada por nuestro equipo.`,
    entidadTipo: "CONSULTING_REQUEST",
    entidadId: requestId,
  })

  revalidatePath("/superadmin/consulting")
  redirect("/superadmin/consulting?success=solicitud_cancelada")
}
