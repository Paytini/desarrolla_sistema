import { Heading, Section, Text } from "@react-email/components"
import { render } from "@react-email/render"
import { EmailLayout } from "./components/EmailLayout"

export async function buildSupportRequestEmail({
  nombreUsuario,
  email,
  empresa,
  rol,
  reasonLabel,
  mensaje,
}: {
  nombreUsuario: string
  email: string
  empresa: string | null
  rol: string
  reasonLabel: string
  mensaje: string
}) {
  const subject = `[Soporte] ${reasonLabel} — ${nombreUsuario}`

  const text = [
    "Nuevo mensaje de soporte",
    "",
    `De: ${nombreUsuario} <${email}>`,
    `Rol: ${rol}`,
    empresa ? `Empresa: ${empresa}` : null,
    `Motivo: ${reasonLabel}`,
    "",
    mensaje,
  ]
    .filter((line) => line !== null)
    .join("\n")

  const html = await render(
    <EmailLayout previewText={subject} skipLogo maxWidth={560}>
      <Heading style={headingStyle}>Nuevo mensaje de soporte</Heading>
      <Text style={reasonStyle}>{reasonLabel}</Text>
      <Section style={rowsSectionStyle}>
        <Section style={rowStyle}>
          <Text style={rowLabelStyle}>De</Text>
          <Text style={rowValueStyle}>
            {nombreUsuario} ({email})
          </Text>
        </Section>
        <Section style={rowStyle}>
          <Text style={rowLabelStyle}>Rol</Text>
          <Text style={rowValueStyle}>{rol}</Text>
        </Section>
        {empresa && (
          <Section style={rowStyle}>
            <Text style={rowLabelStyle}>Empresa</Text>
            <Text style={rowValueStyle}>{empresa}</Text>
          </Section>
        )}
      </Section>
      <Section style={messageBoxStyle}>
        <Text style={messageTextStyle}>{mensaje}</Text>
      </Section>
    </EmailLayout>,
  )

  return { subject, html, text }
}

const headingStyle = { fontSize: "18px", margin: "0 0 4px" }
const reasonStyle = { color: "#6b7280", margin: "0 0 16px", fontSize: "14px" }
const rowsSectionStyle = { marginBottom: "16px" }
const rowStyle = { padding: "4px 0" }
const rowLabelStyle = { fontSize: "13px", color: "#6b7280", margin: "0 0 2px" }
const rowValueStyle = { fontSize: "14px", margin: 0 }

const messageBoxStyle = {
  backgroundColor: "#f8f9fc",
  borderRadius: "8px",
  padding: "16px",
}

const messageTextStyle = {
  whiteSpace: "pre-wrap" as const,
  lineHeight: "1.6",
  fontSize: "14px",
  margin: 0,
}
