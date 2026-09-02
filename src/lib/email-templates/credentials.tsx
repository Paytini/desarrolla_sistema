import { Button, Section, Text } from "@react-email/components"
import { render } from "@react-email/render"
import { EmailLayout } from "./components/EmailLayout"
import { getPortalLoginUrl } from "./shared"

export async function buildCredentialsEmail({
  nombreHr,
  nombreEmpresa,
  email,
  password,
}: {
  nombreHr: string
  nombreEmpresa: string
  email: string
  password: string
}) {
  const loginUrl = getPortalLoginUrl()
  const subject = `¡Bienvenido a Desarrolla360, ${nombreEmpresa}!`

  const features = [
    "Dar de alta y gestionar a tus empleados",
    "Asignar cursos y paquetes de capacitación",
    "Ver el avance y progreso académico de tu equipo",
    "Generar y descargar constancias DC-3",
  ]

  const text = [
    `Hola ${nombreHr},`,
    ``,
    `¡Bienvenido a Desarrolla360! Ya activamos el portal para ${nombreEmpresa}, listo para que empieces a capacitar a tu equipo.`,
    ``,
    `Desde tu panel de HR vas a poder:`,
    ...features.map((f) => `  • ${f}`),
    ``,
    `Estas son tus credenciales de acceso:`,
    `Correo: ${email}`,
    `Contraseña temporal: ${password}`,
    ``,
    `Inicia sesión aquí: ${loginUrl}`,
    ``,
    `Por seguridad, te recomendamos cambiar esta contraseña después de tu primer ingreso.`,
  ].join("\n")

  const html = await render(
    <EmailLayout previewText={subject}>
      <Text style={paragraphStyle}>Hola {nombreHr},</Text>
      <Text style={paragraphStyle}>
        ¡Bienvenido a Desarrolla360! Ya activamos el portal para <strong>{nombreEmpresa}</strong>,
        listo para que empieces a capacitar a tu equipo.
      </Text>
      <Text style={{ ...paragraphStyle, marginBottom: "4px" }}>
        Desde tu panel de HR vas a poder:
      </Text>
      <ul style={listStyle}>
        {features.map((feature) => (
          <li key={feature} style={listItemStyle}>
            {feature}
          </li>
        ))}
      </ul>
      <Text style={{ ...paragraphStyle, marginBottom: "4px" }}>
        Estas son tus credenciales de acceso:
      </Text>
      <Section style={credentialsRowStyle}>
        <Text style={credentialLabelStyle}>Correo</Text>
        <Text style={credentialValueStyle}>{email}</Text>
      </Section>
      <Section style={credentialsRowStyle}>
        <Text style={credentialLabelStyle}>Contraseña temporal</Text>
        <Text style={{ ...credentialValueStyle, fontFamily: "monospace" }}>{password}</Text>
      </Section>
      <Section style={buttonSectionStyle}>
        <Button href={loginUrl} style={buttonStyle}>
          Iniciar sesión
        </Button>
      </Section>
      <Text style={mutedTextStyle}>
        Por seguridad, te recomendamos cambiar esta contraseña después de tu primer ingreso.
      </Text>
    </EmailLayout>,
  )

  return { subject, html, text }
}

const paragraphStyle = { fontSize: "14px", lineHeight: "22px", color: "#1a1a1a" }

const listStyle = { margin: "0 0 16px", paddingLeft: "20px", color: "#334155" }
const listItemStyle = { marginBottom: "4px", fontSize: "14px" }

const credentialsRowStyle = { padding: "6px 0" }
const credentialLabelStyle = { fontSize: "13px", color: "#64748b", margin: "0 0 2px" }
const credentialValueStyle = { fontSize: "14px", fontWeight: 600, margin: 0 }

const buttonSectionStyle = { textAlign: "center" as const, padding: "16px 0" }

const buttonStyle = {
  backgroundColor: "#3579F5",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "14px",
}

const mutedTextStyle = { fontSize: "13px", color: "#64748b" }
