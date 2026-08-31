"use server"

import { getSession } from "@/lib/session"
import { enqueueEmailSendJob } from "@/lib/jobs"
import { buildSupportRequestEmail } from "@/lib/email-templates/support-request"
import { SUPPORT_REASONS, getSupportReasonLabel } from "@/lib/support-reasons"

const SUPPORT_EMAIL = "soporte@desarrolla360.com"
const VALID_REASONS = new Set(SUPPORT_REASONS.map((reason) => reason.id))

export type SupportActionState = { error: string } | { success: true } | null

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function submitSupportRequestAction(
  _prevState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const session = await getSession()
  if (!session) {
    return { error: "Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo." }
  }

  const reason = getString(formData, "reason")
  const message = getString(formData, "message")

  if (!VALID_REASONS.has(reason as (typeof SUPPORT_REASONS)[number]["id"])) {
    return { error: "Selecciona un motivo de contacto." }
  }
  if (message.length < 10 || message.length > 1000) {
    return { error: "Cuéntanos un poco más sobre tu solicitud (entre 10 y 1000 caracteres)." }
  }

  const { subject, html, text } = buildSupportRequestEmail({
    nombreUsuario: session.user.nombre as string,
    email: session.user.email as string,
    empresa: (session.user.empresa as string | undefined) ?? null,
    rol: session.user.role as string,
    reasonLabel: getSupportReasonLabel(reason),
    mensaje: message,
  })

  try {
    await enqueueEmailSendJob({ to: SUPPORT_EMAIL, subject, html, text })
  } catch (error) {
    console.error("No se pudo encolar el mensaje de soporte", {
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      error: `No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos directamente a ${SUPPORT_EMAIL}.`,
    }
  }

  return { success: true }
}
