import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { getCompanyBranding } from "@/lib/company/branding"
import { companyPath } from "@/lib/company/routes"
import { syncEmployeeLearningByEmail } from "@/lib/employee-learning"
import { prisma } from "@/lib/prisma"

const FORCE_SYNC_COOLDOWN_MS = 30_000

export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== "EMPLOYEE" || !session.user.email) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autorizado para refrescar el progreso del empleado.",
      },
      { status: 401 },
    )
  }

  const body = (await request.json().catch(() => null)) as { force?: boolean } | null
  const forceRequested = body?.force ?? false

  if (forceRequested) {
    const latestCurso = await prisma.employeeCourse.findFirst({
      where: { employee: { email: session.user.email } },
      orderBy: { last_synced_at: "desc" },
      select: { last_synced_at: true },
    })
    const lastSync = latestCurso?.last_synced_at?.getTime() ?? 0
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

  if (result.synced) {
    revalidatePath("/employee/courses")
    revalidatePath("/employee/certificates")

    if (forceRequested && result.companyId) {
      const branding = await getCompanyBranding(result.companyId)
      if (branding) {
        revalidatePath(companyPath(branding.slug, "/home"))
        revalidatePath(companyPath(branding.slug, "/progress"))
        revalidatePath(companyPath(branding.slug, "/certificates"))
      }
      revalidateTag(companyCacheRootTag(result.companyId), "max")
      revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    }
  }

  return NextResponse.json(result)
}
