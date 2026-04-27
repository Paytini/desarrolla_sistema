"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import {
  deleteEmployeeRecord,
  purgeExpiredPortalSessions,
  revokePortalSession,
  revokeUserPortalSessions,
  togglePortalUserStatus,
} from "@/lib/access-control"

function getInt(formData: FormData, key: string) {
  return Number.parseInt(String(formData.get(key) ?? "0"), 10)
}

export async function toggleRhUserStatusAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const userId = getInt(formData, "user_id")
  if (!userId) {
    redirect("/superadmin/accesos?error=usuario")
  }

  try {
    const usuario = await togglePortalUserStatus(userId)

    await createAuditEvent({
      actor,
      accion: usuario.activo ? "RH_SUSPENDIDO" : "RH_REACTIVADO",
      entidadTipo: "USUARIO",
      entidadId: usuario.id,
      resumen: `${actor.nombre} ${usuario.activo ? "suspendio" : "reactivo"} un usuario RH.`,
      metadata: {
        rol: usuario.rol,
      },
    })

    revalidatePath("/superadmin/accesos")
    revalidatePath("/superadmin/reportes")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect(`/superadmin/accesos?success=${usuario.activo ? "rh_suspendido" : "rh_activado"}`)
  } catch {
    redirect("/superadmin/accesos?error=usuario")
  }
}

export async function revokeUserSessionsAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const userId = getInt(formData, "user_id")
  if (!userId) {
    redirect("/superadmin/accesos?error=sesion")
  }

  await revokeUserPortalSessions(userId)

  await createAuditEvent({
    actor,
    accion: "SESIONES_REVOCADAS_USUARIO",
    entidadTipo: "USUARIO",
    entidadId: userId,
    resumen: `${actor.nombre} revoco sesiones de un usuario.`,
  })

  revalidatePath("/superadmin/accesos")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/superadmin/accesos?success=sesiones_revocadas")
}

export async function revokeSingleSessionAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const sessionId = getInt(formData, "session_id")
  if (!sessionId) {
    redirect("/superadmin/accesos?error=sesion")
  }

  await revokePortalSession(sessionId)

  await createAuditEvent({
    actor,
    accion: "SESION_REVOCADA",
    entidadTipo: "SESION_PORTAL",
    entidadId: sessionId,
    resumen: `${actor.nombre} revoco una sesion individual.`,
  })

  revalidatePath("/superadmin/accesos")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/superadmin/accesos?success=sesion_revocada")
}

export async function purgeExpiredSessionsAction() {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  await purgeExpiredPortalSessions()

  await createAuditEvent({
    actor,
    accion: "SESIONES_EXPIRADAS_LIMPIADAS",
    entidadTipo: "SESION_PORTAL",
    resumen: `${actor.nombre} limpio sesiones expiradas del portal.`,
  })

  revalidatePath("/superadmin/accesos")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/superadmin/accesos?success=sesiones_limpiadas")
}

export async function deleteEmployeeAsSuperAdminAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const empleadoId = getInt(formData, "empleado_id")
  if (!empleadoId) {
    redirect("/superadmin/accesos?error=empleado")
  }

  let deletedEmployee: Awaited<ReturnType<typeof deleteEmployeeRecord>> | null = null
  try {
    deletedEmployee = await deleteEmployeeRecord({
      empleadoId,
      actor,
      source: "SUPERADMIN",
    })
  } catch {
    redirect("/superadmin/accesos?error=empleado")
  }

  revalidatePath("/superadmin/accesos")
  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  revalidatePath("/superadmin/reportes")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  if (deletedEmployee) {
    revalidateTag(empresaCacheRootTag(deletedEmployee.empresa_id), "max")
  }
  redirect("/superadmin/accesos?success=empleado_eliminado")
}
