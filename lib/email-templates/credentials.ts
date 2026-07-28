function getPortalBaseUrl() {
  return process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") ?? ""
}

function getPortalLoginUrl() {
  const baseUrl = getPortalBaseUrl()
  return baseUrl ? `${baseUrl}/login` : "/login"
}

function getLogoUrl() {
  const baseUrl = getPortalBaseUrl()
  return `${baseUrl}/assets/logo_desarrolla_cropped.png`
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
  const subject = `¡Bienvenido a Desarrolla360, ${nombreEmpresa}!`

  const features = [
    "Dar de alta y gestionar a tus empleados",
    "Asignar cursos y paquetes de capacitación",
    "Ver el avance y progreso académico de tu equipo",
    "Generar y descargar constancias DC-3",
  ]

  const text = [
    `Hola ${nombreRh},`,
    ``,
    `¡Bienvenido a Desarrolla360! Ya activamos el portal para ${nombreEmpresa}, listo para que empieces a capacitar a tu equipo.`,
    ``,
    `Desde tu panel de RH vas a poder:`,
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

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${getLogoUrl()}" alt="Desarrolla360" width="160" style="width: 160px; height: auto;" />
      </div>
      <p>Hola ${escapeHtml(nombreRh)},</p>
      <p>¡Bienvenido a Desarrolla360! Ya activamos el portal para <strong>${escapeHtml(nombreEmpresa)}</strong>, listo para que empieces a capacitar a tu equipo.</p>
      <p style="margin-bottom: 4px;">Desde tu panel de RH vas a poder:</p>
      <ul style="margin: 0 0 16px; padding-left: 20px; color: #334155;">
        ${features.map((f) => `<li style="margin-bottom: 4px;">${escapeHtml(f)}</li>`).join("\n        ")}
      </ul>
      <p style="margin-bottom: 4px;">Estas son tus credenciales de acceso:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px;">
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
