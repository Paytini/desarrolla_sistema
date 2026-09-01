import { auth } from "@/auth"
import { bridgeGetCourseDetails, isWordPressBridgeConfigured } from "@/lib/wordpress/bridge"
import { NextResponse } from "next/server"

export const maxDuration = 60

type RouteContext = {
  params: { courseId: string } | Promise<{ courseId: string }>
}

function parseCourseId(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth()

  if (!session || (session.user.role !== "SUPERADMIN" && session.user.role !== "HR")) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  if (!isWordPressBridgeConfigured()) {
    return NextResponse.json(
      { message: "El puente con WordPress no esta configurado" },
      { status: 400 },
    )
  }

  const params = await Promise.resolve(context.params)
  const courseId = parseCourseId(params.courseId)

  if (!courseId) {
    return NextResponse.json({ message: "Course ID invalido" }, { status: 400 })
  }

  try {
    const payload = await bridgeGetCourseDetails(courseId)
    return NextResponse.json(payload)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible cargar el detalle del curso desde WordPress"

    return NextResponse.json({ message }, { status: 500 })
  }
}
