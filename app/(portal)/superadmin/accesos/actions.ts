"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  deleteEmployeeRecord,
  purgeExpiredPortalSessions,
  revokePortalSession,
  revokeUserPortalSessions,
  togglePortalUserStatus,
} from "@/lib/access-control"

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") {
    redirect("/login")
  }
}

function getInt(formData: FormData, key: string) {
  return Number.parseInt(String(formData.get(key) ?? "0"), 10)
}

export async function toggleRhUserStatusAction(formData: FormData) {
  await requireSuperAdmin()

  const userId = getInt(formData, "user_id")
  if (!userId) {
    redirect("/superadmin/accesos?error=usuario")
  }

  try {
    const usuario = await togglePortalUserStatus(userId)

    revalidatePath("/superadmin/accesos")
    redirect(`/superadmin/accesos?success=${usuario.activo ? "rh_suspendido" : "rh_activado"}`)
  } catch {
    redirect("/superadmin/accesos?error=usuario")
  }
}

export async function revokeUserSessionsAction(formData: FormData) {
  await requireSuperAdmin()

  const userId = getInt(formData, "user_id")
  if (!userId) {
    redirect("/superadmin/accesos?error=sesion")
  }

  await revokeUserPortalSessions(userId)

  revalidatePath("/superadmin/accesos")
  redirect("/superadmin/accesos?success=sesiones_revocadas")
}

export async function revokeSingleSessionAction(formData: FormData) {
  await requireSuperAdmin()

  const sessionId = getInt(formData, "session_id")
  if (!sessionId) {
    redirect("/superadmin/accesos?error=sesion")
  }

  await revokePortalSession(sessionId)

  revalidatePath("/superadmin/accesos")
  redirect("/superadmin/accesos?success=sesion_revocada")
}

export async function purgeExpiredSessionsAction() {
  await requireSuperAdmin()

  await purgeExpiredPortalSessions()

  revalidatePath("/superadmin/accesos")
  redirect("/superadmin/accesos?success=sesiones_limpiadas")
}

export async function deleteEmployeeAsSuperAdminAction(formData: FormData) {
  await requireSuperAdmin()

  const empleadoId = getInt(formData, "empleado_id")
  if (!empleadoId) {
    redirect("/superadmin/accesos?error=empleado")
  }

  try {
    await deleteEmployeeRecord({
      empleadoId,
    })
  } catch {
    redirect("/superadmin/accesos?error=empleado")
  }

  revalidatePath("/superadmin/accesos")
  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/progreso")
  redirect("/superadmin/accesos?success=empleado_eliminado")
}
