import { prisma } from "@/lib/prisma"
import {
  assertAccessConfirmationSucceeded,
  assertEnrollmentSucceeded,
  assertStudentHasCourses,
  bridgeEnrollCourses,
  bridgeEnsureStudentAccess,
  bridgeGetStudentCourses,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

type PackageCourseInput = {
  wp_curso_id: number
  nombre_curso: string
  acceso_origen?: string | null
}

export async function upsertEmployeePackageCourses(
  empleadoId: number,
  packageCourses: PackageCourseInput[]
) {
  for (const packageCourse of packageCourses) {
    await prisma.empleadoCurso.upsert({
      where: {
        empleado_id_wp_curso_id: {
          empleado_id: empleadoId,
          wp_curso_id: packageCourse.wp_curso_id,
        },
      },
      update: {
        nombre_curso: packageCourse.nombre_curso,
        acceso_origen: packageCourse.acceso_origen ?? "DIRECT_ENROLLMENT",
        acceso_estado: "PENDING",
        acceso_error: null,
        ultimo_intento_acceso: new Date(),
      },
      create: {
        empleado_id: empleadoId,
        wp_curso_id: packageCourse.wp_curso_id,
        nombre_curso: packageCourse.nombre_curso,
        progreso_pct: 0,
        completado: false,
        acceso_estado: "PENDING",
        acceso_origen: packageCourse.acceso_origen ?? "DIRECT_ENROLLMENT",
        acceso_error: null,
        ultimo_intento_acceso: new Date(),
        ultima_sincronizacion: new Date(),
      },
    })
  }
}

export async function syncCompanyPackageEnrollments(empresaId: number) {
  const empresa = await prisma.empresa.findUnique({
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
      empleados: {
        where: {
          activo: true,
        },
        orderBy: { id: "asc" },
      },
    },
  })

  if (!empresa) {
    throw new Error("Empresa no encontrada")
  }

  const activePackage = empresa.paquetes[0]
  if (!activePackage) {
    throw new Error("La empresa no tiene un paquete activo asignado")
  }

  if (!isWordPressBridgeConfigured()) {
    throw new Error("El puente con WordPress no esta configurado")
  }

  const courseIds = activePackage.paquete.cursos.map((curso) => curso.wp_curso_id)
  const packageCourses = activePackage.paquete.cursos.map((curso) => ({
    wp_curso_id: curso.wp_curso_id,
    nombre_curso: curso.nombre_curso,
    acceso_origen: activePackage.paquete.modo_entrega,
  }))

  const syncedEmployees: Array<{
    empleadoId: number
    wpUserId: number
    enrolledCount: number
    seededOnly?: boolean
    error?: string
  }> = []

  for (const empleado of empresa.empleados) {
    await upsertEmployeePackageCourses(empleado.id, packageCourses)

    const wpUserId = empleado.wp_user_id
    if (!wpUserId) {
      syncedEmployees.push({
        empleadoId: empleado.id,
        wpUserId: 0,
        enrolledCount: 0,
        seededOnly: true,
      })
      continue
    }

    try {
      if (courseIds.length > 0) {
        const enrollment = await bridgeEnrollCourses(wpUserId, courseIds)
        assertEnrollmentSucceeded(enrollment, courseIds)
        const accessConfirmation = await bridgeEnsureStudentAccess(wpUserId, courseIds)
        assertAccessConfirmationSucceeded(accessConfirmation, courseIds)
      }

      const studentCourses = await bridgeGetStudentCourses(wpUserId)
      if (courseIds.length > 0) {
        assertStudentHasCourses(studentCourses, courseIds)
      }

      for (const course of studentCourses.courses) {
        if (!course.wp_course_id) continue

        await prisma.empleadoCurso.upsert({
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
            acceso_estado: "ACTIVE",
            acceso_origen: activePackage.paquete.modo_entrega,
            acceso_error: null,
            ultimo_intento_acceso: new Date(),
            fecha_inicio_curso: course.started_at ? new Date(course.started_at) : null,
            fecha_completado: course.completed_at ? new Date(course.completed_at) : null,
            ultima_sincronizacion: new Date(),
          },
          create: {
            empleado_id: empleado.id,
            wp_curso_id: course.wp_course_id,
            nombre_curso: course.title,
            progreso_pct: course.progress_pct,
            completado: course.completed,
            acceso_estado: "ACTIVE",
            acceso_origen: activePackage.paquete.modo_entrega,
            acceso_error: null,
            ultimo_intento_acceso: new Date(),
            fecha_inicio_curso: course.started_at ? new Date(course.started_at) : null,
            fecha_completado: course.completed_at ? new Date(course.completed_at) : null,
            ultima_sincronizacion: new Date(),
          },
        })
      }

      syncedEmployees.push({
        empleadoId: empleado.id,
        wpUserId,
        enrolledCount: courseIds.length,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "No fue posible confirmar el acceso academico en Tutor LMS."

      await markEmployeeCourseAccessError(
        empleado.id,
        courseIds,
        activePackage.paquete.modo_entrega,
        message
      )

      syncedEmployees.push({
        empleadoId: empleado.id,
        wpUserId,
        enrolledCount: 0,
        error: message,
      })
    }
  }

  const syncErrors = syncedEmployees.filter((item) => item.error)
  if (syncErrors.length > 0) {
    const errorDetails = syncErrors
      .slice(0, 3)
      .map((item) => `Empleado ${item.empleadoId}: ${item.error}`)
      .join(" | ")

    throw new Error(
      `Se detectaron ${syncErrors.length} empleados con error de acceso durante la sincronizacion. ${errorDetails}`
    )
  }

  return {
    empresaId: empresa.id,
    packageId: activePackage.paquete.id,
    packageName: activePackage.paquete.nombre,
    employeeCount: syncedEmployees.length,
    courseCount: courseIds.length,
    syncedEmployees,
  }
}

export async function markEmployeeCourseAccessError(
  empleadoId: number,
  courseIds: number[],
  accessOrigin: string | null | undefined,
  message: string
) {
  if (courseIds.length === 0) {
    return
  }

  await prisma.empleadoCurso.updateMany({
    where: {
      empleado_id: empleadoId,
      wp_curso_id: { in: courseIds },
    },
    data: {
      acceso_estado: "ERROR",
      acceso_origen: accessOrigin ?? "DIRECT_ENROLLMENT",
      acceso_error: message,
      ultimo_intento_acceso: new Date(),
      ultima_sincronizacion: new Date(),
    },
  })
}
