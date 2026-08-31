import type { ConsultingContactMethod } from "@prisma/client"
import { escapeHtml, getLogoUrl } from "./shared"

const CONTACT_METHOD_LABELS: Record<ConsultingContactMethod, string> = {
  CALL: "Llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
}

export function buildConsultingRequestEmail({
  companyName,
  requesterName,
  requesterEmail,
  area,
  context,
  preferredDateTimeLabel,
  contactPhone,
  contactMethod,
}: {
  companyName: string
  requesterName: string
  requesterEmail: string
  area: string
  context: string
  preferredDateTimeLabel: string
  contactPhone: string
  contactMethod: ConsultingContactMethod
}) {
  const subject = `Nueva solicitud de consultoría — ${area} — ${companyName}`
  const contactMethodLabel = CONTACT_METHOD_LABELS[contactMethod]

  const rows: [string, string][] = [
    ["Empresa", companyName],
    ["Solicitante", `${requesterName} (${requesterEmail})`],
    ["Área", area],
    ["Fecha y hora preferida", preferredDateTimeLabel],
    ["Teléfono de contacto", contactPhone],
    ["Método de contacto preferido", contactMethodLabel],
  ]

  const text = [
    "Nueva solicitud de consultoría",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Contexto:",
    context,
  ].join("\n")

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${getLogoUrl()}" alt="Desarrolla360" width="160" style="width: 160px; height: auto;" />
      </div>
      <h2 style="font-size: 18px; margin-bottom: 16px;">Nueva solicitud de consultoría</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        ${rows
          .map(
            ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top; width: 40%;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>
      <p style="margin-bottom: 4px; color: #64748b; font-size: 13px;">Contexto</p>
      <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(context)}</p>
    </div>
  `.trim()

  return { subject, html, text }
}
