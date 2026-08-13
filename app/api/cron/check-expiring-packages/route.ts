import { NextResponse } from "next/server"
import { hasValidCronSecret } from "@/lib/cron-auth"
import { checkAndNotifyExpiringPackages } from "@/lib/notifications"
import { drainPendingJobs } from "@/lib/jobs"

export const maxDuration = 60

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  await checkAndNotifyExpiringPackages()
  const jobs = await drainPendingJobs()

  return NextResponse.json({ ok: true, jobs })
}
