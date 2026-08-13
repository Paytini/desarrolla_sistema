import { auth } from "@/auth"
import { hasValidCronSecret } from "@/lib/cron-auth"
import { syncStaleEmployeeLearningBatch } from "@/lib/employee-learning"
import { drainPendingJobs } from "@/lib/jobs"
import { NextResponse } from "next/server"

export const maxDuration = 60

// This route's own sync work (up to `limit` employees) can already take a
// while, so the job-queue drain gets a smaller slice of the 60s ceiling than
// check-expiring-packages (whose own work is a single lightweight query).
const JOBS_DRAIN_BUDGET_MS = 20_000

async function runSync(request: Request) {
  const session = await auth()
  const hasSecret = hasValidCronSecret(request)

  if (!hasSecret && session?.user.rol !== "SUPERADMIN") {
    return NextResponse.json(
      {
        ok: false,
        message: "No autorizado para ejecutar sincronizacion en segundo plano.",
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "25", 10)
  const limit = Number.isFinite(limitRaw) ? limitRaw : 25

  const result = await syncStaleEmployeeLearningBatch({ limit })
  const jobs = await drainPendingJobs(JOBS_DRAIN_BUDGET_MS)

  return NextResponse.json({
    ok: true,
    sync_interval_ms: Number.parseInt(process.env.EMPLOYEE_SYNC_INTERVAL_MS ?? "15000", 10) || 15000,
    ...result,
    jobs,
  })
}

// Vercel Cron only issues GET requests; POST stays for manual/external schedulers.
export async function GET(request: Request) {
  return runSync(request)
}

export async function POST(request: Request) {
  return runSync(request)
}

