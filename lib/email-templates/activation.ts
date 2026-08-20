import { escapeHtml, getLogoUrl } from "./shared"

export function buildActivationEmail({
  nombreEmpleado,
  nombreEmpresa,
  activationUrl,
}: {
  nombreEmpleado: string
  nombreEmpresa: string
  activationUrl: string
}) {
  const subject = `Activa tu cuenta en Desarrolla360`

  const text = [
    `Hola ${nombreEmpleado},`,
    ``,
    `${nombreEmpresa} te dio de alta en el portal de capacitación Desarrolla360.`,
    ``,
    `Para entrar necesitas crear tu contraseña. Hazlo aquí:`,
    activationUrl,
    ``,
    `Este enlace vence en 7 días.`,
  ].join("\n")

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${getLogoUrl()}" alt="Desarrolla360" width="160" style="width: 160px; height: auto;" />
      </div>
      <p>Hola ${escapeHtml(nombreEmpleado)},</p>
      <p><strong>${escapeHtml(nombreEmpresa)}</strong> te dio de alta en el portal de capacitación Desarrolla360.</p>
      <p>Para entrar necesitas crear tu contraseña:</p>
      <p>
        <a href="${activationUrl}" style="display: inline-block; background: #3579F5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">
          Activar mi cuenta
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        Este enlace vence en 7 días.
      </p>
    </div>
  `.trim()

  return { subject, html, text }
}
