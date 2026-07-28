function getPortalLoginUrl() {
  const baseUrl = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "")
  return baseUrl ? `${baseUrl}/login` : "/login"
}

export function buildCredentialsEmail({
  nombreRh,
  nombreEmpresa,
  email,
  password,
}: {
  nombreRh: string
  nombreEmpresa: string
  email: string
  password: string
}) {
  const loginUrl = getPortalLoginUrl()
  const subject = `Tu acceso al portal Desarrolla360 — ${nombreEmpresa}`

  const text = [
    `Hola ${nombreRh},`,
    ``,
    `Se creó el acceso de ${nombreEmpresa} al portal Desarrolla360. Estas son tus credenciales:`,
    ``,
    `Correo: ${email}`,
    `Contraseña temporal: ${password}`,
    ``,
    `Inicia sesión aquí: ${loginUrl}`,
    ``,
    `Por seguridad, te recomendamos cambiar esta contraseña después de tu primer ingreso.`,
  ].join("\n")

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p>Hola ${escapeHtml(nombreRh)},</p>
      <p>Se creó el acceso de <strong>${escapeHtml(nombreEmpresa)}</strong> al portal Desarrolla360. Estas son tus credenciales:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Correo</td>
          <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(email)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Contraseña temporal</td>
          <td style="padding: 8px 0; font-weight: 600; font-family: monospace;">${escapeHtml(password)}</td>
        </tr>
      </table>
      <p>
        <a href="${loginUrl}" style="display: inline-block; background: #3579F5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">
          Iniciar sesión
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        Por seguridad, te recomendamos cambiar esta contraseña después de tu primer ingreso.
      </p>
    </div>
  `.trim()

  return { subject, html, text }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
