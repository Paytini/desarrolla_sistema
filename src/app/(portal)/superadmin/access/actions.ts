"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { getCompanyBranding } from "@/lib/company/branding"
import { companyPath } from "@/lib/company/routes"
import {
  deleteEmployeeRecord,
  toggleEmployeeStatus,
  togglePortalUserStatus,
} from "@/lib/access-control"
import { isUuid } from "@/lib/uuid"

function getInt(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function toggleHrUserStatusAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const userId = getInt(formData, "user_id")
  if (!userId) {
    redirect("/superadmin/access?error=usuario")
  }

  try {
    const user = await togglePortalUserStatus(userId, "SUPERADMIN")

    await createAuditEvent({
      actor,
      accion: user.active ? "HR_SUSPENDIDO" : "HR_REACTIVADO",
      entityType: "USUARIO",
      entityId: user.id,
      resumen: `${actor.nombre} ${user.active ? "suspendio" : "reactivo"} un usuario HR.`,
      metadata: {
        role: user.role,
      },
    })

    revalidatePath("/superadmin/access")
    revalidatePath("/superadmin/reports")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect(`/superadmin/access?success=${user.active ? "hr_suspendido" : "hr_activado"}`)
  } catch {
    redirect("/superadmin/access?error=usuario")
  }
}

export async function toggleEmployeeStatusAsSuperAdminAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const employeeId = getInt(formData, "empleado_id")
  if (!employeeId || !isUuid(employeeId)) {
    redirect("/superadmin/access?error=empleado")
  }

  let employee: Awaited<ReturnType<typeof toggleEmployeeStatus>> | null = null
  try {
    employee = await toggleEmployeeStatus({
      employeeId,
      actor,
      source: "SUPERADMIN",
    })
  } catch {
    redirect("/superadmin/access?error=empleado")
  }

  revalidatePath("/superadmin/access")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  if (employee) {
    revalidateTag(companyCacheRootTag(employee.company_id), "max")
    const branding = await getCompanyBranding(employee.company_id)
    if (branding) {
      revalidatePath(companyPath(branding.slug, "/employees"))
      revalidatePath(companyPath(branding.slug, "/home"))
      revalidatePath(companyPath(branding.slug, "/progress"))
    }
  }
  redirect(
    `/superadmin/access?success=${employee?.active ? "empleado_suspendido" : "empleado_activado"}`,
  )
}

export async function deleteEmployeeAsSuperAdminAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const employeeId = getInt(formData, "empleado_id")
  if (!employeeId || !isUuid(employeeId)) {
    redirect("/superadmin/access?error=empleado")
  }

  let deletedEmployee: Awaited<ReturnType<typeof deleteEmployeeRecord>> | null = null
  try {
    deletedEmployee = await deleteEmployeeRecord({
      employeeId,
      actor,
      source: "SUPERADMIN",
    })
  } catch {
    redirect("/superadmin/access?error=empleado")
  }

  revalidatePath("/superadmin/access")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  if (deletedEmployee) {
    revalidateTag(companyCacheRootTag(deletedEmployee.company_id), "max")
    const branding = await getCompanyBranding(deletedEmployee.company_id)
    if (branding) {
      revalidatePath(companyPath(branding.slug, "/employees"))
      revalidatePath(companyPath(branding.slug, "/home"))
      revalidatePath(companyPath(branding.slug, "/progress"))
    }
  }
  redirect("/superadmin/access?success=empleado_eliminado")
}
