import { NextResponse } from "next/server"
import { hasValidCronSecret } from "@/lib/cron-auth"
import { checkAndNotifyExpiringPackages } from "@/lib/notifications"

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  await checkAndNotifyExpiringPackages()

  return NextResponse.json({ ok: true })
}
