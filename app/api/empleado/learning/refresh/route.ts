import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import { syncEmployeeLearningByEmail } from "@/lib/employee-learning"

export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.email) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autorizado para refrescar el progreso del empleado.",
      },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null) as { force?: boolean } | null
  const result = await syncEmployeeLearningByEmail(session.user.email, {
    force: body?.force ?? false,
  })

  revalidatePath("/empleado/cursos")
  revalidatePath("/empleado/constancias")

  if (result.empresaId) {
    revalidatePath("/empresa/inicio")
    revalidatePath("/empresa/progreso")
    revalidatePath("/empresa/constancias")
    revalidateTag(empresaCacheRootTag(result.empresaId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  }

  return NextResponse.json(result)
}
