function getConfiguredCronSecret() {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.BACKGROUND_SYNC_SECRET?.trim() ||
    process.env.SYNC_JOBS_SECRET?.trim() ||
    ""
  )
}

export function hasValidCronSecret(request: Request) {
  const expectedSecret = getConfiguredCronSecret()
  if (!expectedSecret) {
    return false
  }

  const authHeader = request.headers.get("authorization")?.trim() ?? ""
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim() === expectedSecret
  }

  return request.headers.get("x-sync-secret")?.trim() === expectedSecret
}
