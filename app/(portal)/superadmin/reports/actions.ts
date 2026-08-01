"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { getCompanyBranding } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import { syncCompanyPackageEnrollments } from "@/lib/course-sync"
import {
  scheduleCompanyEmployeeLearningBatch,
  scheduleStaleEmployeeLearningBatch,
} from "@/lib/employee-learning"

function getSyncErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : "No fue posible sincronizar el paquete con la empresa."
  const normalizedMessage = rawMessage.toLowerCase()

  if (rawMessage.includes("status 404")) {
    return "El plugin de WordPress no tiene el endpoint nuevo de confirmacion de acceso."
  }

  if (rawMessage.includes("status 401") || normalizedMessage.includes("credenciales insuficientes")) {
    return "WordPress rechazo autenticacion del bridge. Revisa WP_BRIDGE_PORTAL_KEY."
  }

  if (normalizedMessage.includes("service user")) {
    return "Falta configurar Service User ID en el plugin bridge de WordPress."
  }

  if (normalizedMessage.includes("no tienes permisos para hacer eso")) {
    return "Tutor LMS rechazo la confirmacion de acceso academico. Revisa API Key/Secret de Tutor en el plugin bridge."
  }

  return rawMessage.slice(0, 500)
}

export async function triggerGlobalLearningSyncAction() {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const queued = scheduleStaleEmployeeLearningBatch({ limit: 100 })

  await createAuditEvent({
    actor,
    accion: queued ? "SYNC_GLOBAL_EN_COLA" : "SYNC_GLOBAL_YA_EN_COLA",
    entityType: "SISTEMA",
    resumen: `${actor.nombre} solicito sincronizacion global de aprendizaje.`,
  })

  revalidatePath("/superadmin/reports")
  revalidatePath("/employee/courses")
  revalidatePath("/employee/certificates")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  redirect(`/superadmin/reports?success=${queued ? "sync_background_started" : "sync_background_already_running"}`)
}

export async function retryCompanySyncAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)
  const companyId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)

  if (!companyId) {
    redirect("/superadmin/reports?error=sync_retry")
  }

  let packageSyncError: string | null = null

  try {
    await syncCompanyPackageEnrollments(companyId)
  } catch (error) {
    packageSyncError = getSyncErrorMessage(error)
  }

  const queued = scheduleCompanyEmployeeLearningBatch(companyId, {
    limit: 100,
    staleOnly: false,
  })

  await createAuditEvent({
    actor,
    accion: packageSyncError ? "SYNC_EMPRESA_REINTENTO_PARCIAL" : "SYNC_EMPRESA_REINTENTO_OK",
    entityType: "EMPRESA",
    entityId: companyId,
    companyId,
    resumen: `${actor.nombre} ejecuto reintento de sincronizacion para la empresa ${companyId}.`,
    metadata: {
      package_sync_error: packageSyncError,
      learning_sync_queued: queued,
    },
  })

  const branding = await getCompanyBranding(companyId)

  revalidatePath("/superadmin/reports")
  revalidatePath("/superadmin/packages")
  if (branding) {
    revalidatePath(companyPath(branding.slug, "/employees"))
    revalidatePath(companyPath(branding.slug, "/progress"))
  }
  revalidatePath("/employee/courses")
  revalidatePath("/employee/certificates")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(companyId), "max")

  if (packageSyncError) {
    const detail = encodeURIComponent(packageSyncError)
    redirect(`/superadmin/reports?success=sync_retry_partial&detail=${detail}`)
  }

  redirect(`/superadmin/reports?success=${queued ? "sync_retry_ok" : "sync_retry_queue_busy"}`)
}
