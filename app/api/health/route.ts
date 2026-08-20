import { NextResponse } from "next/server"

const REQUIRED_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "WP_BRIDGE_BASE_URL",
  "WP_BRIDGE_PORTAL_KEY",
  "BRIDGE_WEBHOOK_SECRET",
  "BLOB_READ_WRITE_TOKEN",
] as const

const SECRET_VARS = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const

export async function GET() {
  const missing: string[] = []

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key)
  }

  const hasAuthSecret = SECRET_VARS.some((key) => Boolean(process.env[key]))
  if (!hasAuthSecret) missing.push("AUTH_SECRET")

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, missing }, { status: 503 })
  }

  return NextResponse.json({ ok: true })
}
