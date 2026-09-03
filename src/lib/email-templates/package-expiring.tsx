import { Button, Section, Text } from "@react-email/components"
import { render } from "@react-email/render"
import { EmailLayout } from "./components/EmailLayout"
import { getPortalLoginUrl } from "./shared"

export async function buildPackageExpiringEmail({
  nombreHr,
  nombreEmpresa,
  daysLabel,
}: {
  nombreHr: string
  nombreEmpresa: string
  daysLabel: string
}) {
  const loginUrl = getPortalLoginUrl()
  const subject = `Tu paquete vence en ${daysLabel} — ${nombreEmpresa}`

  const text = [
    `Hola ${nombreHr},`,
    ``,
    `El paquete de capacitación de ${nombreEmpresa} vence en ${daysLabel}.`,
    ``,
    `Contacta a soporte de Desarrolla360 para renovarlo y que tu equipo no pierda acceso a sus cursos.`,
    ``,
    `Revisa el estado de tu paquete aquí: ${loginUrl}`,
  ].join("\n")

  const html = await render(
    <EmailLayout previewText={subject}>
      <Text style={paragraphStyle}>Hola {nombreHr},</Text>
      <Text style={paragraphStyle}>
        El paquete de capacitación de <strong>{nombreEmpresa}</strong> vence en{" "}
        <span style={highlightStyle}>{daysLabel}</span>.
      </Text>
      <Text style={paragraphStyle}>
        Contacta a soporte de Desarrolla360 para renovarlo y que tu equipo no pierda acceso a sus
        cursos.
      </Text>
      <Section style={buttonSectionStyle}>
        <Button href={loginUrl} style={buttonStyle}>
          Ver mi paquete
        </Button>
      </Section>
    </EmailLayout>,
  )

  return { subject, html, text }
}

const paragraphStyle = { fontSize: "14px", lineHeight: "22px", color: "#1a1a1a" }
const highlightStyle = { color: "#d97706", fontWeight: 700 }
const buttonSectionStyle = { textAlign: "center" as const, padding: "20px 0 0" }

const buttonStyle = {
  backgroundColor: "#3579F5",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "14px",
}
