import { decodeHtmlEntities } from "@/lib/format"
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
  wp_course_id: number
  course_name: string
  access_source?: string | null
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
  employeeId: number,
  packageCourse: PackageCourseInput,
  syncedAt: Date
) {
  return prisma.employeeCourse.upsert({
    where: {
      employee_id_wp_course_id: {
        employee_id: employeeId,
        wp_course_id: packageCourse.wp_course_id,
      },
    },
    update: {
      course_name: packageCourse.course_name,
      access_source: packageCourse.access_source ?? "DIRECT_ENROLLMENT",
      access_status: "PENDING",
      access_error: null,
      last_access_attempt: syncedAt,
    },
    create: {
      employee_id: employeeId,
      wp_course_id: packageCourse.wp_course_id,
      course_name: packageCourse.course_name,
      progress_pct: 0,
      completed: false,
      access_status: "PENDING",
      access_source: packageCourse.access_source ?? "DIRECT_ENROLLMENT",
      access_error: null,
      last_access_attempt: syncedAt,
      last_synced_at: syncedAt,
    },
  })
}

export async function upsertEmployeePackageCourses(
  employeeId: number,
  packageCourses: PackageCourseInput[]
) {
  if (packageCourses.length === 0) {
    return
  }

  const syncedAt = new Date()
  await prisma.$transaction(
    packageCourses.map((packageCourse) =>
      buildPackageCourseUpsertOperation(employeeId, packageCourse, syncedAt)
    )
  )
}

export async function replaceEmployeePackageCourses(
  employeeId: number,
  packageCourses: PackageCourseInput[]
) {
  const selectedCourseIds = packageCourses.map((course) => course.wp_course_id)
  const syncedAt = new Date()

  const deleteOperation = selectedCourseIds.length > 0
    ? prisma.employeeCourse.deleteMany({
        where: {
          employee_id: employeeId,
          wp_course_id: {
            notIn: selectedCourseIds,
          },
        },
      })
    : prisma.employeeCourse.deleteMany({
        where: {
          employee_id: employeeId,
        },
      })

  const operations = [
    deleteOperation,
    ...packageCourses.map((packageCourse) =>
      buildPackageCourseUpsertOperation(employeeId, packageCourse, syncedAt)
    ),
  ]

  await prisma.$transaction(operations)
}

export async function syncCompanyPackageEnrollments(companyId: number) {
  const company = await prisma.company.findUnique({
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
      employees: {
        where: {
          active: true,
        },
        orderBy: { id: "asc" },
      },
    },
  })

  if (!company) {
    throw new Error("Empresa no encontrada")
  }

  const activePackage = company.packages[0]
  if (!activePackage) {
    throw new Error("La empresa no tiene un paquete activo asignado")
  }

  if (!isWordPressBridgeConfigured()) {
    throw new Error("El puente con WordPress no esta configurado")
  }

  const courseIds = activePackage.package.courses.map((course) => course.wp_course_id)
  const courseIdSet = new Set(courseIds)
  const packageCourses = activePackage.package.courses.map((course) => ({
    wp_course_id: course.wp_course_id,
    course_name: course.course_name,
    access_source: activePackage.package.delivery_mode,
  }))

  const syncedEmployees: Array<{
    employeeId: number
    wpUserId: number
    enrolledCount: number
    seededOnly?: boolean
    error?: string
  }> = []

  for (const employee of company.employees) {
    await replaceEmployeePackageCourses(employee.id, packageCourses)

    const wpUserId = employee.wp_user_id
    if (!wpUserId) {
      syncedEmployees.push({
        employeeId: employee.id,
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

          return prisma.employeeCourse.upsert({
            where: {
              employee_id_wp_course_id: {
                employee_id: employee.id,
                wp_course_id: course.wp_course_id,
              },
            },
            update: {
              course_name: decodeHtmlEntities(course.title),
              progress_pct: course.progress_pct,
              completed: course.completed,
              access_status: "ACTIVE",
              access_source: activePackage.package.delivery_mode,
              access_error: null,
              last_access_attempt: syncedAt,
              course_start_date: startedAt,
              completed_at: completedAt,
              last_synced_at: syncedAt,
            },
            create: {
              employee_id: employee.id,
              wp_course_id: course.wp_course_id,
              course_name: decodeHtmlEntities(course.title),
              progress_pct: course.progress_pct,
              completed: course.completed,
              access_status: "ACTIVE",
              access_source: activePackage.package.delivery_mode,
              access_error: null,
              last_access_attempt: syncedAt,
              course_start_date: startedAt,
              completed_at: completedAt,
              last_synced_at: syncedAt,
            },
          })
        })

      if (upsertOperations.length > 0) {
        await prisma.$transaction(upsertOperations)
      }

      syncedEmployees.push({
        employeeId: employee.id,
        wpUserId,
        enrolledCount: courseIds.length,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "No fue posible confirmar el acceso academico en Tutor LMS."

      await markEmployeeCourseAccessError(
        employee.id,
        courseIds,
        activePackage.package.delivery_mode,
        message
      )

      syncedEmployees.push({
        employeeId: employee.id,
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
      .map((item) => `Empleado ${item.employeeId}: ${item.error}`)
      .join(" | ")

    throw new Error(
      `Se detectaron ${syncErrors.length} empleados con error de acceso durante la sincronizacion. ${errorDetails}`
    )
  }

  return {
    companyId: company.id,
    packageId: activePackage.package.id,
    packageName: activePackage.package.name,
    employeeCount: syncedEmployees.length,
    courseCount: courseIds.length,
    syncedEmployees,
  }
}

export async function markEmployeeCourseAccessError(
  employeeId: number,
  courseIds: number[],
  accessOrigin: string | null | undefined,
  message: string
) {
  if (courseIds.length === 0) {
    return
  }

  await prisma.employeeCourse.updateMany({
    where: {
      employee_id: employeeId,
      wp_course_id: { in: courseIds },
    },
    data: {
      access_status: "ERROR",
      access_source: accessOrigin ?? "DIRECT_ENROLLMENT",
      access_error: message,
      last_access_attempt: new Date(),
      last_synced_at: new Date(),
    },
  })
}
