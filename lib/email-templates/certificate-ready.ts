import { escapeHtml, getLogoUrl, getPortalLoginUrl } from "./shared"

export function buildCertificateReadyEmail({
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

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${getLogoUrl()}" alt="Desarrolla360" width="160" style="width: 160px; height: auto;" />
      </div>
      <p>Hola ${escapeHtml(employeeName)},</p>
      <p>${escapeHtml(intro)}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        ${certificates
          .map(
            (c) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(c.courseName)}</div>
            <a href="${c.certificateUrl}" style="color: #3579F5; text-decoration: none; font-size: 13px;">Descargar constancia →</a>
          </td>
        </tr>`
          )
          .join("\n        ")}
      </table>
      <p>
        <a href="${loginUrl}" style="display: inline-block; background: #3579F5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">
          Ver en el portal
        </a>
      </p>
    </div>
  `.trim()

  return { subject, html, text }
}
