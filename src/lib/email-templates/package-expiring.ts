import { escapeHtml, getLogoUrl, getPortalLoginUrl } from "./shared"

export function buildPackageExpiringEmail({
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

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${getLogoUrl()}" alt="Desarrolla360" width="160" style="width: 160px; height: auto;" />
      </div>
      <p>Hola ${escapeHtml(nombreHr)},</p>
      <p>
        El paquete de capacitación de <strong>${escapeHtml(nombreEmpresa)}</strong> vence en
        <strong style="color: #d97706;">${escapeHtml(daysLabel)}</strong>.
      </p>
      <p>Contacta a soporte de Desarrolla360 para renovarlo y que tu equipo no pierda acceso a sus cursos.</p>
      <p>
        <a href="${loginUrl}" style="display: inline-block; background: #3579F5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">
          Ver mi paquete
        </a>
      </p>
    </div>
  `.trim()

  return { subject, html, text }
}
