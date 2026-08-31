import { escapeHtml } from "./shared"

export function buildSupportRequestEmail({
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

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Nuevo mensaje de soporte</h2>
      <p style="color: #6b7280; margin-top: 0;">${escapeHtml(reasonLabel)}</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280; width: 100px;">De</td>
          <td>${escapeHtml(nombreUsuario)} (${escapeHtml(email)})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280;">Rol</td>
          <td>${escapeHtml(rol)}</td>
        </tr>
        ${
          empresa
            ? `<tr><td style="padding: 4px 0; color: #6b7280;">Empresa</td><td>${escapeHtml(empresa)}</td></tr>`
            : ""
        }
      </table>
      <div style="background: #f8f9fc; border-radius: 8px; padding: 16px; white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${escapeHtml(mensaje)}</div>
    </div>
  `.trim()

  return { subject, html, text }
}
