"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { requireRhSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { requireCompanySlug } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import { setCourseAssignment } from "@/lib/course-sync"
import { notifyCompanyRH, notifySuperadmins, notifyUsuarioByEmail } from "@/lib/notifications"
import type { PortalPackageCourseRecord } from "@/lib/learning-types"
import { prisma } from "@/lib/prisma"

export type CourseAssignmentResult = {
  ok: boolean
  message: string
}

function parseEmployeeIds(values: string[]) {
  return [...new Set(values.map((id) => id.trim()).filter((id) => id.length > 0))]
}

export async function setCourseAssignmentsAction(
  courseId: number,
  employeeIds: string[]
): Promise<CourseAssignmentResult> {
  const session = await requireRhSession()
  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)
  const assignmentsPath = companyPath(slug, "/assignments")

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: "Curso inválido." }
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      packages: {
        where: { active: true },
        orderBy: { created_at: "desc" },
        include: { package: { include: { courses: true } } },
        take: 1,
      },
      employees: {
        where: { active: true },
        select: { id: true, first_name: true, last_name: true, email: true },
      },
    },
  })

  const activePackage = company?.packages[0]
  if (!company || !activePackage) {
    return { ok: false, message: "Tu empresa no tiene un paquete activo asignado." }
  }

  const packageCourses = activePackage.package.courses as PortalPackageCourseRecord[]
  const course = packageCourses.find((c) => c.wp_course_id === courseId)
  if (!course) {
    return { ok: false, message: "El curso seleccionado no pertenece al paquete activo." }
  }

  const validEmployeeIds = parseEmployeeIds(employeeIds).filter((id) =>
    company.employees.some((employee) => employee.id === id)
  )

  const { addedEmployees, removedCount, bridgeErrors } = await setCourseAssignment(
    companyId,
    courseId,
    course.course_name,
    validEmployeeIds,
    activePackage.package.delivery_mode
  )

  for (const employee of addedEmployees) {
    await notifyUsuarioByEmail(employee.email, {
      tipo: "CURSO_ASIGNADO",
      titulo: "Nuevo curso asignado",
      mensaje: `Se te asignó el curso "${course.course_name}".`,
    })
  }

  if (bridgeErrors.length > 0) {
    const details = bridgeErrors
      .slice(0, 3)
      .map((item) => `Empleado ${item.employeeId}: ${item.message}`)
      .join(" | ")

    await notifyCompanyRH(companyId, {
      tipo: "SYNC_FALLIDO",
      titulo: "Sincronización fallida",
      mensaje: `Falló la actualización de acceso de ${bridgeErrors.length} colaborador(es) al curso "${course.course_name}".`,
    })
    await notifySuperadmins({
      tipo: "SYNC_FALLIDO",
      titulo: "Sincronización fallida",
      mensaje: `Falló la sincronización con WordPress al asignar "${course.course_name}" en ${company.name}. ${details}`,
    })
  }

  revalidatePath(assignmentsPath)
  revalidatePath(companyPath(slug, "/progress"))
  revalidatePath("/employee/courses")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  if (bridgeErrors.length > 0) {
    return {
      ok: true,
      message: `Se guardaron los cambios, pero falló la actualización de acceso para ${bridgeErrors.length} colaborador(es). Se reintentará en el siguiente sync.`,
    }
  }

  const parts: string[] = []
  if (addedEmployees.length > 0) parts.push(`se asignó a ${addedEmployees.length} colaborador(es)`)
  if (removedCount > 0) parts.push(`se quitó a ${removedCount} colaborador(es)`)

  return {
    ok: true,
    message: parts.length > 0 ? `Cambios guardados: ${parts.join(" y ")}.` : "Cambios guardados.",
  }
}
