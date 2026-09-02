"use server"

import type { ConsultingArea, ConsultingContactMethod } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireHrSession } from "@/lib/auth-guards"
import { getCompanyBranding, requireCompanySlug } from "@/lib/company/branding"
import { companyPath } from "@/lib/company/routes"
import { CONSULTING_AREAS } from "@/lib/consulting/areas"
import {
  formatConsultingDateTime,
  isDateSelectable,
  isTimeSlotValid,
} from "@/lib/consulting/schedule"
import { buildConsultingRequestEmail } from "@/lib/email-templates/consulting-request"
import { notifySuperadmins } from "@/lib/notifications"
import { enqueueEmailSendJob } from "@/lib/jobs"
import { prisma } from "@/lib/prisma"
import { isUuid } from "@/lib/uuid"

export type ConsultingActionState = { error: string } | { success: true } | null

const VALID_CONTACT_METHODS: ConsultingContactMethod[] = ["CALL", "WHATSAPP", "EMAIL"]

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function sanitizeReturnTo(path: string | null | undefined, slug: string) {
  const value = (path ?? "").trim()
  const base = companyPath(slug, "/consulting")
  if (!value.startsWith(base)) return base
  return value
}

function withStatus(path: string, key: "success" | "error", value: string) {
  const [pathname, rawQuery = ""] = path.split("?", 2)
  const searchParams = new URLSearchParams(rawQuery)
  searchParams.set(key, value)

  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export async function createConsultingRequestAction(
  _prevState: ConsultingActionState,
  formData: FormData,
): Promise<ConsultingActionState> {
  const session = await requireHrSession()

  const areaId = getString(formData, "area")
  const context = getString(formData, "context")
  const preferredDate = getString(formData, "preferred_date")
  const preferredTime = getString(formData, "preferred_time")
  const contactPhone = getString(formData, "contact_phone")
  const contactMethod = getString(formData, "contact_method")

  const areaOption = CONSULTING_AREAS.find((option) => option.id === areaId)
  const phoneDigits = contactPhone.replace(/\D/g, "")
  const isValidContactMethod = VALID_CONTACT_METHODS.includes(
    contactMethod as ConsultingContactMethod,
  )

  const isValid =
    Boolean(areaOption) &&
    context.length >= 10 &&
    context.length <= 400 &&
    isDateSelectable(preferredDate) &&
    isTimeSlotValid(preferredTime) &&
    phoneDigits.length >= 10 &&
    isValidContactMethod

  if (!isValid || !areaOption) {
    return { error: "datos" }
  }

  const companyId = session.user.empresa_id as string
  const branding = await getCompanyBranding(companyId)
  if (!branding) return { error: "datos" }

  const request = await prisma.consultingRequest.create({
    data: {
      company_id: companyId,
      requested_by_user_id: session.user.id,
      area: areaOption.id as ConsultingArea,
      context,
      preferred_date: new Date(`${preferredDate}T12:00:00.000Z`),
      preferred_time: preferredTime,
      contact_phone: contactPhone,
      contact_method: contactMethod as ConsultingContactMethod,
    },
  })

  try {
    const notifyTo = process.env.CONSULTING_NOTIFICATION_EMAIL
    if (notifyTo) {
      const { subject, html, text } = await buildConsultingRequestEmail({
        companyName: branding.name,
        requesterName: session.user.nombre,
        requesterEmail: session.user.email ?? "",
        area: areaOption.label,
        context,
        preferredDateTimeLabel: formatConsultingDateTime(preferredDate, preferredTime),
        contactPhone,
        contactMethod: contactMethod as ConsultingContactMethod,
      })
      await enqueueEmailSendJob({ to: notifyTo, subject, html, text })
    }
  } catch (error) {
    console.error("No se pudo enviar el correo de solicitud de consultoría", error)
  }

  try {
    await notifySuperadmins({
      tipo: "CONSULTORIA_SOLICITADA",
      titulo: "Nueva solicitud de consultoría",
      mensaje: `${branding.name} solicitó una consultoría de ${areaOption.label}.`,
      entidadTipo: "CONSULTING_REQUEST",
      entidadId: request.id,
    })
  } catch (error) {
    console.error("No se pudo crear la notificación interna de la solicitud de consultoría", error)
  }

  return { success: true }
}

export async function cancelConsultingRequestAction(formData: FormData) {
  const session = await requireHrSession()
  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
  const returnTo = sanitizeReturnTo(getString(formData, "return_to"), slug)
  const requestId = getString(formData, "request_id")

  if (!requestId || !isUuid(requestId)) {
    redirect(withStatus(returnTo, "error", "solicitud"))
  }

  const existing = await prisma.consultingRequest.findFirst({
    where: { id: requestId, company_id: companyId, status: "PENDING" },
    select: { id: true },
  })

  if (!existing) {
    redirect(withStatus(returnTo, "error", "solicitud"))
  }

  await prisma.consultingRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  })

  revalidatePath(companyPath(slug, "/consulting"))

  redirect(withStatus(returnTo, "success", "solicitud_cancelada"))
}
