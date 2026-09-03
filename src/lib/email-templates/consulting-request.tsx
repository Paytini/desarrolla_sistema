import type { ConsultingContactMethod } from "@prisma/client"
import { Heading, Section, Text } from "@react-email/components"
import { render } from "@react-email/render"
import { EmailLayout } from "./components/EmailLayout"

const CONTACT_METHOD_LABELS: Record<ConsultingContactMethod, string> = {
  CALL: "Llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
}

export async function buildConsultingRequestEmail({
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

  const html = await render(
    <EmailLayout previewText={subject}>
      <Heading style={headingStyle}>Nueva solicitud de consultoría</Heading>
      <Section style={rowsSectionStyle}>
        {rows.map(([label, value]) => (
          <Section key={label} style={rowStyle}>
            <Text style={rowLabelStyle}>{label}</Text>
            <Text style={rowValueStyle}>{value}</Text>
          </Section>
        ))}
      </Section>
      <Text style={contextLabelStyle}>Contexto</Text>
      <Text style={contextTextStyle}>{context}</Text>
    </EmailLayout>,
  )

  return { subject, html, text }
}

const headingStyle = { fontSize: "18px", margin: "0 0 16px" }
const rowsSectionStyle = { marginBottom: "16px" }
const rowStyle = { padding: "6px 0" }
const rowLabelStyle = { fontSize: "13px", color: "#64748b", margin: "0 0 2px" }
const rowValueStyle = { fontSize: "14px", fontWeight: 600, margin: 0 }
const contextLabelStyle = { fontSize: "13px", color: "#64748b", marginBottom: "4px" }
const contextTextStyle = { whiteSpace: "pre-wrap" as const, lineHeight: "1.6", fontSize: "14px" }
