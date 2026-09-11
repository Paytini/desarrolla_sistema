import { NextResponse } from "next/server"
import { hasValidCronSecret } from "@/lib/cron-auth"
import {
  checkAndNotifyExpiringCourseAccess,
  checkAndNotifyExpiringPackages,
} from "@/lib/notifications"

export const maxDuration = 60

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  await checkAndNotifyExpiringPackages()
  await checkAndNotifyExpiringCourseAccess()

  return NextResponse.json({ ok: true })
}
