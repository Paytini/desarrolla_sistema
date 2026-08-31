import { auth } from "@/auth"
import { getWordPressCourseCatalog } from "@/lib/wordpress-course-catalog"
import { isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  if (!isWordPressBridgeConfigured()) {
    return NextResponse.json(
      { message: "El puente con WordPress no esta configurado" },
      { status: 400 },
    )
  }

  try {
    const payload = await getWordPressCourseCatalog()
    return NextResponse.json(payload)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No fue posible cargar los cursos desde WordPress"

    return NextResponse.json({ message }, { status: 500 })
  }
}
