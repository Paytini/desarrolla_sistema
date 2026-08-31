const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// Sin esto, un Cloudflare que no responde deja la petición de login colgada
// hasta que la mata el timeout de la función. La política sigue siendo
// fail-closed: si no se puede verificar, no se entra.
const VERIFY_TIMEOUT_MS = 4000

type TurnstileVerifyResponse = {
  success: boolean
  "error-codes"?: string[]
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  if (!token) return false

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY no está configurada — rechazando login por seguridad.")
    return false
  }

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set("remoteip", remoteIp)

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })
    if (!res.ok) return false

    const data = (await res.json()) as TurnstileVerifyResponse
    return data.success === true
  } catch (error) {
    console.error("Turnstile verification request failed", {
      message: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
