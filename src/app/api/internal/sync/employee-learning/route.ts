import { auth } from "@/auth"
import { hasValidCronSecret } from "@/lib/cron-auth"
import { syncStaleEmployeeLearningBatch } from "@/lib/employee-learning"
import { NextResponse } from "next/server"

export const maxDuration = 300

async function runSync(request: Request) {
  const session = await auth()
  const hasSecret = hasValidCronSecret(request)

  if (!hasSecret && session?.user.role !== "SUPERADMIN") {
    return NextResponse.json(
      {
        ok: false,
        message: "No autorizado para ejecutar sincronizacion en segundo plano.",
      },
      { status: 401 },
    )
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "25", 10)
  const limit = Number.isFinite(limitRaw) ? limitRaw : 25

  const result = await syncStaleEmployeeLearningBatch({ limit })

  return NextResponse.json({
    ok: true,
    sync_interval_ms:
      Number.parseInt(process.env.EMPLOYEE_SYNC_INTERVAL_MS ?? "15000", 10) || 15000,
    ...result,
  })
}

// Vercel Cron only issues GET requests; POST stays for manual/external schedulers.
export async function GET(request: Request) {
  return runSync(request)
}

export async function POST(request: Request) {
  return runSync(request)
}
