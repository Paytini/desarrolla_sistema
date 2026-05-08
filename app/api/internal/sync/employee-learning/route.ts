import { auth } from "@/auth"
import { syncStaleEmployeeLearningBatch } from "@/lib/employee-learning"
import { NextResponse } from "next/server"

function hasValidSecret(request: Request) {
  const expectedSecret =
    process.env.BACKGROUND_SYNC_SECRET?.trim() ||
    process.env.SYNC_JOBS_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ""

  if (!expectedSecret) {
    return false
  }

  const authHeader = request.headers.get("authorization")?.trim() ?? ""
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim()
    return token === expectedSecret
  }

  return request.headers.get("x-sync-secret")?.trim() === expectedSecret
}

export async function POST(request: Request) {
  const session = await auth()
  const hasSecret = hasValidSecret(request)

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

  return NextResponse.json({
    ok: true,
    sync_interval_ms: Number.parseInt(process.env.EMPLOYEE_SYNC_INTERVAL_MS ?? "60000", 10) || 60000,
    ...result,
  })
}

export const GET = POST
