"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { requireRhSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import { replaceEmployeePackageCourses } from "@/lib/course-sync"
import { notifyEmpresaRH, notifySuperadmins, notifyUsuarioByEmail } from "@/lib/notifications"
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

  const empresaId = session.user.empresa_id as number
  const empleadoId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
  const selectedCourseIds = parseCourseIds(formData.getAll("course_ids"))

  if (!empleadoId) {
    redirect("/company/assignments?error=datos")
  }

  const [empleado, empresa] = await Promise.all([
    prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresa_id: empresaId,
        activo: true,
      },
      select: {
        id: true,
        wp_user_id: true,
        nombre: true,
        apellido: true,
        email: true,
      },
    }),
    prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        paquetes: {
          where: { activo: true },
          orderBy: { created_at: "desc" },
          include: {
            paquete: {
              include: {
                cursos: true,
              },
            },
          },
          take: 1,
        },
      },
    }),
  ])

  if (!empleado || !empresa) {
    redirect("/company/assignments?error=empleado")
  }

  const activePackage = empresa.paquetes[0]
  if (!activePackage) {
    redirect("/company/assignments?error=paquete")
  }

  const packageCourses = activePackage.paquete.cursos as PortalPackageCourseRecord[]
  const allowedCourseMap = new Map(
    packageCourses.map((course: PortalPackageCourseRecord) => [course.wp_curso_id, course])
  )

  const validSelectedCourses = selectedCourseIds
    .filter((courseId) => allowedCourseMap.has(courseId))
    .map((courseId) => {
      const course = allowedCourseMap.get(courseId)!
      return {
        wp_curso_id: course.wp_curso_id,
        nombre_curso: course.nombre_curso,
      }
    })

  if (selectedCourseIds.length > 0 && validSelectedCourses.length === 0) {
    redirect("/company/assignments?error=cursos")
  }

  await replaceEmployeePackageCourses(empleado.id, validSelectedCourses)

  const courseNames = validSelectedCourses.map((course) => course.nombre_curso)
  const courseAssignmentMessage =
    courseNames.length === 1
      ? `Se te asignó el curso "${courseNames[0]}".`
      : `Se te asignaron ${courseNames.length} cursos nuevos.`

  if (validSelectedCourses.length === 0) {
    revalidatePath("/company/assignments")
    revalidatePath("/company/progress")
    revalidatePath("/employee/courses")
    revalidateTag(empresaCacheRootTag(empresaId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect("/company/assignments?success=limpio_local")
  }

  if (!empleado.wp_user_id || !isWordPressBridgeConfigured()) {
    await notifyUsuarioByEmail(empleado.email, {
      tipo: "CURSO_ASIGNADO",
      titulo: "Nuevo curso asignado",
      mensaje: courseAssignmentMessage,
    })
    revalidatePath("/company/assignments")
    revalidatePath("/company/progress")
    revalidatePath("/employee/courses")
    revalidateTag(empresaCacheRootTag(empresaId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect("/company/assignments?success=asignado_local")
  }

  try {
    const syncedAt = new Date()
    await bridgeEnrollCourses(
      empleado.wp_user_id,
      validSelectedCourses.map((course) => course.wp_curso_id)
    )

    const studentCourses = await bridgeGetStudentCourses(empleado.wp_user_id)
    const selectedIdsSet = new Set(validSelectedCourses.map((course) => course.wp_curso_id))

    const upsertOperations = studentCourses.courses
      .filter((course) => hasValidWpCourseId(course) && selectedIdsSet.has(course.wp_course_id))
      .map((course) => {
        const startedAt = parseBridgeDate(course.started_at)
        const completedAt = parseBridgeDate(course.completed_at)

        return prisma.empleadoCurso.upsert({
          where: {
            empleado_id_wp_curso_id: {
              empleado_id: empleado.id,
              wp_curso_id: course.wp_course_id,
            },
          },
          update: {
            nombre_curso: course.title,
            progreso_pct: course.progress_pct,
            completado: course.completed,
            fecha_inicio_curso: startedAt,
            fecha_completado: completedAt,
            ultima_sincronizacion: syncedAt,
          },
          create: {
            empleado_id: empleado.id,
            wp_curso_id: course.wp_course_id,
            nombre_curso: course.title,
            progreso_pct: course.progress_pct,
            completado: course.completed,
            fecha_inicio_curso: startedAt,
            fecha_completado: completedAt,
            ultima_sincronizacion: syncedAt,
          },
        })
      })

    if (upsertOperations.length > 0) {
      await prisma.$transaction(upsertOperations)
    }
  } catch {
    await notifyUsuarioByEmail(empleado.email, {
      tipo: "CURSO_ASIGNADO",
      titulo: "Nuevo curso asignado",
      mensaje: courseAssignmentMessage,
    })

    const syncFailMensaje = `Falló la sincronización con WordPress al asignar cursos a ${empleado.nombre} ${empleado.apellido} (${empresa.nombre}).`
    await notifyEmpresaRH(empresaId, {
      tipo: "SYNC_FALLIDO",
      titulo: "Sincronización fallida",
      mensaje: `Falló la sincronización con WordPress al asignar cursos a ${empleado.nombre} ${empleado.apellido}.`,
    })
    await notifySuperadmins({
      tipo: "SYNC_FALLIDO",
      titulo: "Sincronización fallida",
      mensaje: syncFailMensaje,
    })

    revalidatePath("/company/assignments")
    revalidatePath("/employee/courses")
    revalidateTag(empresaCacheRootTag(empresaId), "max")
    revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    redirect("/company/assignments?success=asignado_local&error=bridge_sync")
  }

  await notifyUsuarioByEmail(empleado.email, {
    tipo: "CURSO_ASIGNADO",
    titulo: "Nuevo curso asignado",
    mensaje: courseAssignmentMessage,
  })

  revalidatePath("/company/assignments")
  revalidatePath("/company/progress")
  revalidatePath("/employee/courses")
  revalidateTag(empresaCacheRootTag(empresaId), "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/company/assignments?success=asignado_sync")
}
