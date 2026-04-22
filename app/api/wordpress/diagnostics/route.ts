import { auth } from "@/auth"
import { bridgeGetStudentDiagnostics, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"
import { NextRequest, NextResponse } from "next/server"

function parseInteger(value: string | null) {
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session || (session.user.rol !== "SUPERADMIN" && session.user.rol !== "RH")) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  if (!isWordPressBridgeConfigured()) {
    return NextResponse.json(
      { message: "El puente con WordPress no esta configurado" },
      { status: 400 }
    )
  }

  const studentId = parseInteger(request.nextUrl.searchParams.get("studentId"))
  const courseId = parseInteger(request.nextUrl.searchParams.get("courseId"))

  if (!studentId) {
    return NextResponse.json(
      { message: "Debes enviar `studentId` en el query string." },
      { status: 400 }
    )
  }

  try {
    const payload = await bridgeGetStudentDiagnostics(studentId, courseId ?? undefined)
    return NextResponse.json(payload)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible cargar el diagnostico desde WordPress"

    return NextResponse.json({ message }, { status: 500 })
  }
}
