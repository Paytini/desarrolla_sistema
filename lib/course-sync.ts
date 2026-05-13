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

function buildPackageCourseUpsertOperation(
  empleadoId: number,
  packageCourse: PackageCourseInput,
  syncedAt: Date
) {
  return prisma.empleadoCurso.upsert({
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
      ultimo_intento_acceso: syncedAt,
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
      ultimo_intento_acceso: syncedAt,
      ultima_sincronizacion: syncedAt,
    },
  })
}

export async function upsertEmployeePackageCourses(
  empleadoId: number,
  packageCourses: PackageCourseInput[]
) {
  if (packageCourses.length === 0) {
    return
  }

  const syncedAt = new Date()
  await prisma.$transaction(
    packageCourses.map((packageCourse) =>
      buildPackageCourseUpsertOperation(empleadoId, packageCourse, syncedAt)
    )
  )
}

export async function replaceEmployeePackageCourses(
  empleadoId: number,
  packageCourses: PackageCourseInput[]
) {
  const selectedCourseIds = packageCourses.map((course) => course.wp_curso_id)
  const syncedAt = new Date()

  const deleteOperation = selectedCourseIds.length > 0
    ? prisma.empleadoCurso.deleteMany({
        where: {
          empleado_id: empleadoId,
          wp_curso_id: {
            notIn: selectedCourseIds,
          },
        },
      })
    : prisma.empleadoCurso.deleteMany({
        where: {
          empleado_id: empleadoId,
        },
      })

  const operations = [
    deleteOperation,
    ...packageCourses.map((packageCourse) =>
      buildPackageCourseUpsertOperation(empleadoId, packageCourse, syncedAt)
    ),
  ]

  await prisma.$transaction(operations)
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
  const courseIdSet = new Set(courseIds)
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
    await replaceEmployeePackageCourses(empleado.id, packageCourses)

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

      const syncedAt = new Date()
      const upsertOperations = studentCourses.courses
        .filter((course) => hasValidWpCourseId(course) && courseIdSet.has(course.wp_course_id))
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
              acceso_estado: "ACTIVE",
              acceso_origen: activePackage.paquete.modo_entrega,
              acceso_error: null,
              ultimo_intento_acceso: syncedAt,
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
              acceso_estado: "ACTIVE",
              acceso_origen: activePackage.paquete.modo_entrega,
              acceso_error: null,
              ultimo_intento_acceso: syncedAt,
              fecha_inicio_curso: startedAt,
              fecha_completado: completedAt,
              ultima_sincronizacion: syncedAt,
            },
          })
        })

      if (upsertOperations.length > 0) {
        await prisma.$transaction(upsertOperations)
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
