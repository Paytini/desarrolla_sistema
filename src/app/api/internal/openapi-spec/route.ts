import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") {
    return new NextResponse("No autorizado", { status: 401 })
  }

  const raw = await readFile(path.join(process.cwd(), "openapi.yaml"), "utf-8")

  return new NextResponse(raw, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  })
}
