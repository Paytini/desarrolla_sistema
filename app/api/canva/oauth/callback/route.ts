import { auth } from "@/auth"
import { exchangeCanvaAuthorizationCode } from "@/lib/canva"
import { NextResponse } from "next/server"

function buildRedirect(path: string) {
  return new URL(path, process.env.NEXTAUTH_URL ?? "http://localhost:3000")
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") {
    return new Response("No autorizado", { status: 401 })
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const state = requestUrl.searchParams.get("state")
  const error = requestUrl.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(buildRedirect(`/superadmin/integracion?canva_error=${encodeURIComponent(error)}`))
  }

  const cookieHeader = request.headers.get("cookie") ?? ""
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("=", 2))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  )

  if (!code || !state || cookies.canva_oauth_state !== state || !cookies.canva_oauth_verifier) {
    return NextResponse.redirect(buildRedirect("/superadmin/integracion?canva_error=oauth_state"))
  }

  try {
    await exchangeCanvaAuthorizationCode({
      code,
      codeVerifier: cookies.canva_oauth_verifier,
    })

    const response = NextResponse.redirect(buildRedirect("/superadmin/integracion?success=canva_connected"))
    response.cookies.delete("canva_oauth_state")
    response.cookies.delete("canva_oauth_verifier")
    return response
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "canva_oauth"
    return NextResponse.redirect(
      buildRedirect(`/superadmin/integracion?canva_error=${encodeURIComponent(message)}`)
    )
  }
}
