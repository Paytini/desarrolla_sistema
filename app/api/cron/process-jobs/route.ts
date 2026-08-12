import { NextResponse } from "next/server"
import { hasValidCronSecret } from "@/lib/cron-auth"
import { processPendingJobs } from "@/lib/jobs"

export const maxDuration = 300

async function runProcessJobs(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  const result = await processPendingJobs()

  return NextResponse.json({ ok: true, ...result })
}

// Vercel Cron only issues GET requests; POST stays for manual/external schedulers.
export async function GET(request: Request) {
  return runProcessJobs(request)
}

export async function POST(request: Request) {
  return runProcessJobs(request)
}
