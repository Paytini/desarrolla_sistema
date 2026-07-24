"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { requireRhSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { replaceEmployeePackageCourses } from "@/lib/course-sync"
import { notifyCompanyRH, notifySuperadmins, notifyUsuarioByEmail } from "@/lib/notifications"
import type { PortalPackageCourseRecord } from "@/lib/learning-types"
import { prisma } from "@/lib/prisma"
import {
  bridgeEnrollCourses,
  bridgeGetStudentCourses,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

function parseCourseIds(values: FormDataEntryValue[]) {
  return [
    ...new Set(
      values
        .map((value) => Number.parseInt(String(value), 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ]
}

function hasValidWpCourseId<T extends { wp_course_id?: number | null }>(
  course: T
): course is T & { wp_course_id: number } {
  return Number.isInteger(course.wp_course_id) && Number(course.wp_course_id) > 0
}

function parseBridgeDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function assignEmployeeCoursesAction(formData: FormData) {
  const session = await requireRhSession()

  const companyId = session.user.empresa_id as number
  const employeeId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const selectedCourseIds = parseCourseIds(formData.getAll("course_ids"))

  if (!employeeId) {
    redirect("/company/assignments?error=datos")
  }

  const [employee, company] = await Promise.all([
    prisma.employee.findFirst({
      where: {
        id: employeeId,
        company_id: companyId,
        active: true,
      },
      select: {
        id: true,
        wp_user_id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      include: {
        packages: {
          where: { active: true },
          orderBy: { created_at: "desc" },
          include: {
            package: {
              include: {
                courses: true,
              },
            },
          },
          take: 1,
        },
      },
    }),
  ])

  if (!employee || !company) {
    redirect("/company/assignments?error=empleado")
  }

  const activePackage = company.packages[0]
  if (!activePackage) {
    redirect("/company/assignments?error=paquete")
  }

  const packageCourses = activePackage.package.courses as PortalPackageCourseRecord[]
  const allowedCourseMap = new Map(
    packageCourses.map((course: PortalPackageCourseRecord) => [course.wp_course_id, course])
  )

  const validSelectedCourses = selectedCourseIds
    .filter((courseId) => allowedCourseMap.has(courseId))
    .map((courseId) => {
      const course = allowedCourseMap.get(courseId)!
      return {
        wp_course_id: course.wp_course_id,
        course_name: course.course_name,
      }
    })

  if (selectedCourseIds.length > 0 && validSelectedCourses.length === 0) {
    redirect("/company/assignments?error=cursos")
  }

  await replaceEmployeePackageCourses(employee.id, validSelectedCourses)

  const courseNames = validSelectedCourses.map((course) => course.course_name)
  const courseAssignmentMessage =
    courseNames.length === 1
      ? `Se te asignó el curso "${courseNames[0]}".`
      : `Se te asignaron ${courseNames.length} cursos nuevos.`

  if (validSelectedCourses.length === 0) {
    revalidatePath("/company/assignments")
    revalidatePath("/company/progress")
    revalidatePath("/employee/courses")
    revalidateTag(companyCacheRootTag(companyId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect("/company/assignments?success=limpio_local")
  }

  if (!employee.wp_user_id || !isWordPressBridgeConfigured()) {
    await notifyUsuarioByEmail(employee.email, {
      tipo: "CURSO_ASIGNADO",
      titulo: "Nuevo curso asignado",
      mensaje: courseAssignmentMessage,
    })
    revalidatePath("/company/assignments")
    revalidatePath("/company/progress")
    revalidatePath("/employee/courses")
    revalidateTag(companyCacheRootTag(companyId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect("/company/assignments?success=asignado_local")
  }

  try {
    const syncedAt = new Date()
    await bridgeEnrollCourses(
      employee.wp_user_id,
      validSelectedCourses.map((course) => course.wp_course_id)
    )

    const studentCourses = await bridgeGetStudentCourses(employee.wp_user_id)
    const selectedIdsSet = new Set(validSelectedCourses.map((course) => course.wp_course_id))

    const upsertOperations = studentCourses.courses
      .filter((course) => hasValidWpCourseId(course) && selectedIdsSet.has(course.wp_course_id))
      .map((course) => {
        const startedAt = parseBridgeDate(course.started_at)
        const completedAt = parseBridgeDate(course.completed_at)

        return prisma.employeeCourse.upsert({
          where: {
            employee_id_wp_course_id: {
              employee_id: employee.id,
              wp_course_id: course.wp_course_id,
            },
          },
          update: {
            course_name: course.title,
            progress_pct: course.progress_pct,
            completed: course.completed,
            course_start_date: startedAt,
            completed_at: completedAt,
            last_synced_at: syncedAt,
          },
          create: {
            employee_id: employee.id,
            wp_course_id: course.wp_course_id,
            course_name: course.title,
            progress_pct: course.progress_pct,
            completed: course.completed,
            course_start_date: startedAt,
            completed_at: completedAt,
            last_synced_at: syncedAt,
          },
        })
      })

    if (upsertOperations.length > 0) {
      await prisma.$transaction(upsertOperations)
    }
  } catch {
    await notifyUsuarioByEmail(employee.email, {
      tipo: "CURSO_ASIGNADO",
      titulo: "Nuevo curso asignado",
      mensaje: courseAssignmentMessage,
    })

    const syncFailMensaje = `Falló la sincronización con WordPress al asignar cursos a ${employee.first_name} ${employee.last_name} (${company.name}).`
    await notifyCompanyRH(companyId, {
      tipo: "SYNC_FALLIDO",
      titulo: "Sincronización fallida",
      mensaje: `Falló la sincronización con WordPress al asignar cursos a ${employee.first_name} ${employee.last_name}.`,
    })
    await notifySuperadmins({
      tipo: "SYNC_FALLIDO",
      titulo: "Sincronización fallida",
      mensaje: syncFailMensaje,
    })

    revalidatePath("/company/assignments")
    revalidatePath("/employee/courses")
    revalidateTag(companyCacheRootTag(companyId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect("/company/assignments?success=asignado_local&error=bridge_sync")
  }

  await notifyUsuarioByEmail(employee.email, {
    tipo: "CURSO_ASIGNADO",
    titulo: "Nuevo curso asignado",
    mensaje: courseAssignmentMessage,
  })

  revalidatePath("/company/assignments")
  revalidatePath("/company/progress")
  revalidatePath("/employee/courses")
  revalidateTag(companyCacheRootTag(companyId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/company/assignments?success=asignado_sync")
}
