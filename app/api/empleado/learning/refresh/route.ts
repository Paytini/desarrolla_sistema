import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import { syncEmployeeLearningByEmail } from "@/lib/employee-learning"
import { prisma } from "@/lib/prisma"

const FORCE_SYNC_COOLDOWN_MS = 30_000

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
  const forceRequested = body?.force ?? false

  if (forceRequested) {
    const latestCurso = await prisma.empleadoCurso.findFirst({
      where: { empleado: { email: session.user.email } },
      orderBy: { ultima_sincronizacion: "desc" },
      select: { ultima_sincronizacion: true },
    })
    const lastSync = latestCurso?.ultima_sincronizacion?.getTime() ?? 0
    if (Date.now() - lastSync < FORCE_SYNC_COOLDOWN_MS) {
      return NextResponse.json({
        ok: true,
        synced: false,
        skipped: true,
        message: "Sincronización reciente. Intenta de nuevo en unos segundos.",
      })
    }
  }

  const result = await syncEmployeeLearningByEmail(session.user.email, {
    force: forceRequested,
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
