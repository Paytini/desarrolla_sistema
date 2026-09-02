import { Button, Link, Section, Text } from "@react-email/components"
import { render } from "@react-email/render"
import { EmailLayout } from "./components/EmailLayout"
import { getPortalLoginUrl } from "./shared"

export async function buildCertificateReadyEmail({
  employeeName,
  certificates,
}: {
  employeeName: string
  certificates: { courseName: string; certificateUrl: string }[]
}) {
  const loginUrl = getPortalLoginUrl()
  const subject =
    certificates.length === 1
      ? `Tu constancia DC-3 de "${certificates[0].courseName}" ya está lista`
      : `Tienes ${certificates.length} constancias DC-3 nuevas`

  const intro =
    certificates.length === 1
      ? `Tu constancia DC-3 de "${certificates[0].courseName}" ya está lista para descargar.`
      : `Tienes ${certificates.length} constancias DC-3 nuevas listas para descargar.`

  const text = [
    `Hola ${employeeName},`,
    ``,
    intro,
    ``,
    ...certificates.map((c) => `• ${c.courseName}: ${c.certificateUrl}`),
    ``,
    `También puedes verlas todas desde tu portal: ${loginUrl}`,
  ].join("\n")

  const html = await render(
    <EmailLayout previewText={subject}>
      <Text style={paragraphStyle}>Hola {employeeName},</Text>
      <Text style={paragraphStyle}>{intro}</Text>
      {certificates.map((certificate) => (
        <Section key={certificate.certificateUrl} style={certificateRowStyle}>
          <Text style={certificateNameStyle}>{certificate.courseName}</Text>
          <Link href={certificate.certificateUrl} style={certificateLinkStyle}>
            Descargar constancia →
          </Link>
        </Section>
      ))}
      <Section style={buttonSectionStyle}>
        <Button href={loginUrl} style={buttonStyle}>
          Ver en el portal
        </Button>
      </Section>
    </EmailLayout>,
  )

  return { subject, html, text }
}

const paragraphStyle = { fontSize: "14px", lineHeight: "22px", color: "#1a1a1a" }

const certificateRowStyle = {
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
}

const certificateNameStyle = { fontWeight: 600, fontSize: "14px", margin: "0 0 4px" }

const certificateLinkStyle = {
  color: "#3579F5",
  textDecoration: "none",
  fontSize: "13px",
}

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
