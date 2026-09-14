export function getPortalBaseUrl() {
  return process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") ?? ""
}

export function getPortalLoginUrl() {
  const baseUrl = getPortalBaseUrl()
  return baseUrl ? `${baseUrl}/login` : "/login"
}

export function getLogoUrl() {
  const baseUrl = getPortalBaseUrl()
  return `${baseUrl}/assets/logo/logo_desarrolla_cropped.png`
}
