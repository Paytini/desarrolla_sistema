import { auth } from "@/auth"
import {
  buildCanvaAuthorizationUrl,
  createCanvaOauthState,
  createCanvaPkcePair,
  isCanvaConfigured,
} from "@/lib/canva"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") {
    return new Response("No autorizado", { status: 401 })
  }

  if (!isCanvaConfigured()) {
    return NextResponse.redirect(
      new URL("/superadmin/integracion?canva_error=config", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
    )
  }

  const state = createCanvaOauthState()
  const pkce = createCanvaPkcePair()
  const response = NextResponse.redirect(
    buildCanvaAuthorizationUrl({
      state,
      codeChallenge: pkce.challenge,
    })
  )

  response.cookies.set("canva_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  })
  response.cookies.set("canva_oauth_verifier", pkce.verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  })

  return response
}
