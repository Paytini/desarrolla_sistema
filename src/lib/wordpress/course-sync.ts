import { decodeHtmlEntities } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { mapWithConcurrency } from "@/lib/concurrency"
import { notifySuperadmins } from "@/lib/notifications"
import {
  assertAccessConfirmationSucceeded,
  assertEnrollmentSucceeded,
  assertStudentHasCourses,
  bridgeCompanyBatchEnrollAndEnsureAccess,
  bridgeEnrollCourses,
  bridgeEnsureStudentAccess,
  bridgeGetStudentEnrolledCourses,
  bridgeRevokeCourseAccess,
  isWordPressBridgeConfigured,
  type BridgeCompanyBatchStudentResult,
  type BridgeStudentCourse,
} from "@/lib/wordpress/bridge"

const BATCH_VERIFY_CONCURRENCY = 5
const COMPANY_BATCH_SIZE = 5
const COMPANY_BATCH_CONCURRENCY = 2
const BATCH_VERIFY_STUDENT_COURSES_TIMEOUT_MS = 60_000

type PackageCourseInput = {
  wp_course_id: number
  course_name: string
  access_source?: string | null
}

function hasValidWpCourseId<T extends { wp_course_id?: number | null }>(
  course: T,
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
  employeeId: string,
  packageCourse: PackageCourseInput,
  syncedAt: Date,
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

export async function replaceEmployeePackageCourses(
  employeeId: string,
  wpUserId: number | null,
  packageCourses: PackageCourseInput[],
) {
  const selectedCourseIds = packageCourses.map((course) => course.wp_course_id)
  const syncedAt = new Date()

  const coursesToRemove = await prisma.employeeCourse.findMany({
    where: {
      employee_id: employeeId,
      ...(selectedCourseIds.length > 0 ? { wp_course_id: { notIn: selectedCourseIds } } : {}),
    },
    select: { wp_course_id: true },
  })

  if (wpUserId && coursesToRemove.length > 0 && isWordPressBridgeConfigured()) {
    try {
      const revocation = await bridgeRevokeCourseAccess(
        wpUserId,
        coursesToRemove.map((course) => course.wp_course_id),
      )
      if (revocation.failed_course_ids.length > 0) {
        throw new Error(
          revocation.failed_course_ids.map((item) => `Curso ${item.course_id}: ${item.message}`).join(" | "),
        )
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "No fue posible revocar el acceso en Tutor LMS."

      await notifySuperadmins({
        tipo: "REVOCACION_FALLIDA",
        titulo: "No se pudo revocar acceso a curso",
        mensaje: `No se pudo revocar en Tutor LMS el acceso del empleado ${employeeId} a ${coursesToRemove.length} curso(s) removido(s) del paquete: ${message}`,
      })
    }
  }

  const deleteOperation =
    selectedCourseIds.length > 0
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
      buildPackageCourseUpsertOperation(employeeId, packageCourse, syncedAt),
    ),
  ]

  await prisma.$transaction(operations)
}

export type PackageSyncImpact = {
  packageName: string
  employeesLosingAccess: number
  coursesLost: number
  coursesAtRisk: number
  employeesGainingAccess: number
  coursesGained: number
}

export async function computePackageSyncImpact(companyId: string): Promise<PackageSyncImpact> {
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
        select: {
          courses: { select: { wp_course_id: true, progress_pct: true, completed: true } },
        },
      },
    },
  })

  const activePackage = company?.packages[0]?.package
  if (!company || !activePackage) {
    return {
      packageName: activePackage?.name ?? "",
      employeesLosingAccess: 0,
      coursesLost: 0,
      coursesAtRisk: 0,
      employeesGainingAccess: 0,
      coursesGained: 0,
    }
  }

  const packageCourseIds = new Set(activePackage.courses.map((course) => course.wp_course_id))

  let employeesLosingAccess = 0
  let coursesLost = 0
  let coursesAtRisk = 0
  let employeesGainingAccess = 0
  let coursesGained = 0

  for (const employee of company.employees) {
    const currentCourseIds = new Set(employee.courses.map((course) => course.wp_course_id))

    const losing =
      packageCourseIds.size > 0
        ? employee.courses.filter((course) => !packageCourseIds.has(course.wp_course_id))
        : employee.courses
    if (losing.length > 0) {
      employeesLosingAccess += 1
      coursesLost += losing.length
      coursesAtRisk += losing.filter((course) => course.completed || course.progress_pct > 0).length
    }

    const gaining = [...packageCourseIds].filter((courseId) => !currentCourseIds.has(courseId))
    if (gaining.length > 0) {
      employeesGainingAccess += 1
      coursesGained += gaining.length
    }
  }

  return {
    packageName: activePackage.name,
    employeesLosingAccess,
    coursesLost,
    coursesAtRisk,
    employeesGainingAccess,
    coursesGained,
  }
}

export async function setCourseAssignment(
  companyId: string,
  courseId: number,
  courseName: string,
  employeeIds: string[],
  accessSource?: string | null,
) {
  const currentRows = await prisma.employeeCourse.findMany({
    where: { wp_course_id: courseId, employee: { company_id: companyId } },
    select: { employee_id: true },
  })
  const currentIds = new Set(currentRows.map((row) => row.employee_id))
  const desiredIds = new Set(employeeIds)

  const toAdd = employeeIds.filter((id) => !currentIds.has(id))
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id))

  const syncedAt = new Date()

  if (toRemove.length > 0) {
    await prisma.employeeCourse.deleteMany({
      where: { wp_course_id: courseId, employee_id: { in: toRemove } },
    })
  }

  if (toAdd.length > 0) {
    await prisma.$transaction(
      toAdd.map((employeeId) =>
        buildPackageCourseUpsertOperation(
          employeeId,
          { wp_course_id: courseId, course_name: courseName, access_source: accessSource },
          syncedAt,
        ),
      ),
    )
  }

  const addedEmployees = await prisma.employee.findMany({
    where: { id: { in: toAdd } },
    select: { id: true, wp_user_id: true, email: true, first_name: true, last_name: true },
  })

  const bridgeErrors: Array<{ employeeId: string; message: string }> = []

  if (isWordPressBridgeConfigured()) {
    const results = await mapWithConcurrency(
      addedEmployees,
      BATCH_VERIFY_CONCURRENCY,
      async (employee): Promise<{ employeeId: string; message: string } | null> => {
        if (!employee.wp_user_id) return null

        try {
          const enrollment = await bridgeEnrollCourses(employee.wp_user_id, [courseId])
          assertEnrollmentSucceeded(enrollment, [courseId])

          const accessConfirmation = await bridgeEnsureStudentAccess(employee.wp_user_id, [
            courseId,
          ])
          assertAccessConfirmationSucceeded(accessConfirmation, [courseId])

          const studentCourses = await bridgeGetStudentEnrolledCourses(employee.wp_user_id, [
            courseId,
          ])
          const match = studentCourses.courses.find(
            (course) => hasValidWpCourseId(course) && course.wp_course_id === courseId,
          )

          if (match) {
            // El avance/nombre reales los trae la sincronizacion periodica; aqui solo
            // confirmamos la matricula y marcamos ACTIVE.
            await prisma.employeeCourse.update({
              where: {
                employee_id_wp_course_id: { employee_id: employee.id, wp_course_id: courseId },
              },
              data: {
                access_status: "ACTIVE",
                access_error: null,
                last_access_attempt: syncedAt,
                course_start_date: parseBridgeDate(match.started_at),
                last_synced_at: syncedAt,
              },
            })
          }
          return null
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message.slice(0, 500)
              : "No fue posible confirmar el acceso académico en Tutor LMS."

          await markEmployeeCourseAccessError(employee.id, [courseId], accessSource, message)
          return { employeeId: employee.id, message }
        }
      },
    )

    bridgeErrors.push(
      ...results.filter((result): result is { employeeId: string; message: string } => result !== null),
    )
  }

  return {
    addedEmployees,
    removedCount: toRemove.length,
    bridgeErrors,
  }
}

export type PackageEnrollmentSyncResult = {
  employeeId: string
  wpUserId: number
  enrolledCount: number
  seededOnly?: boolean
  error?: string
}

function buildStudentCourseUpsertOperation(
  employeeId: string,
  course: BridgeStudentCourse & { wp_course_id: number },
  deliveryMode: string,
  syncedAt: Date,
) {
  const startedAt = parseBridgeDate(course.started_at)
  const completedAt = parseBridgeDate(course.completed_at)

  return prisma.employeeCourse.upsert({
    where: {
      employee_id_wp_course_id: {
        employee_id: employeeId,
        wp_course_id: course.wp_course_id,
      },
    },
    update: {
      // Solo estado de acceso: nombre/avance/finalizacion los actualiza la
      // sincronizacion periodica desde Tutor LMS.
      access_status: "ACTIVE",
      access_source: deliveryMode,
      access_error: null,
      last_access_attempt: syncedAt,
      course_start_date: startedAt,
      last_synced_at: syncedAt,
    },
    create: {
      employee_id: employeeId,
      wp_course_id: course.wp_course_id,
      course_name: decodeHtmlEntities(course.title),
      progress_pct: course.progress_pct,
      completed: course.completed,
      access_status: "ACTIVE",
      access_source: deliveryMode,
      access_error: null,
      last_access_attempt: syncedAt,
      course_start_date: startedAt,
      completed_at: completedAt,
      last_synced_at: syncedAt,
    },
  })
}

async function verifyAndUpsertEmployeeEnrollment(
  employee: { id: string; wp_user_id: number },
  courseIds: number[],
  courseIdSet: Set<number>,
  deliveryMode: string,
): Promise<PackageEnrollmentSyncResult> {
  try {
    const studentCourses = await bridgeGetStudentEnrolledCourses(
      employee.wp_user_id,
      courseIds,
      BATCH_VERIFY_STUDENT_COURSES_TIMEOUT_MS,
    )
    assertStudentHasCourses(studentCourses, courseIds)

    const syncedAt = new Date()
    const upsertOperations = studentCourses.courses
      .filter((course) => hasValidWpCourseId(course) && courseIdSet.has(course.wp_course_id))
      .map((course) =>
        buildStudentCourseUpsertOperation(employee.id, course, deliveryMode, syncedAt),
      )

    if (upsertOperations.length > 0) {
      await prisma.$transaction(upsertOperations)
    }

    return {
      employeeId: employee.id,
      wpUserId: employee.wp_user_id,
      enrolledCount: courseIds.length,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "No fue posible confirmar el acceso academico en Tutor LMS."

    await markEmployeeCourseAccessError(employee.id, courseIds, deliveryMode, message)

    return {
      employeeId: employee.id,
      wpUserId: employee.wp_user_id,
      enrolledCount: 0,
      error: message,
    }
  }
}

export async function syncEmployeeChunkPackageEnrollment(
  employees: { id: string; wp_user_id: number | null }[],
  packageCourses: PackageCourseInput[],
  courseIds: number[],
  courseIdSet: Set<number>,
  deliveryMode: string,
): Promise<PackageEnrollmentSyncResult[]> {
  const seededResults: PackageEnrollmentSyncResult[] = []
  const readyEmployees: { id: string; wp_user_id: number | null }[] = []

  await Promise.all(
    employees.map(async (employee) => {
      try {
        await replaceEmployeePackageCourses(employee.id, employee.wp_user_id, packageCourses)
        readyEmployees.push(employee)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message.slice(0, 500)
            : "No fue posible actualizar los cursos asignados del empleado."

        await markEmployeeCourseAccessError(employee.id, courseIds, deliveryMode, message)
        seededResults.push({
          employeeId: employee.id,
          wpUserId: employee.wp_user_id ?? 0,
          enrolledCount: 0,
          error: message,
        })
      }
    }),
  )

  const withWpUser = readyEmployees.filter(
    (employee): employee is { id: string; wp_user_id: number } => Boolean(employee.wp_user_id),
  )
  seededResults.push(
    ...readyEmployees
      .filter((employee) => !employee.wp_user_id)
      .map((employee) => ({
        employeeId: employee.id,
        wpUserId: 0,
        enrolledCount: 0,
        seededOnly: true,
      })),
  )

  if (courseIds.length === 0 || withWpUser.length === 0) {
    return [
      ...seededResults,
      ...withWpUser.map((employee) => ({
        employeeId: employee.id,
        wpUserId: employee.wp_user_id,
        enrolledCount: 0,
        seededOnly: true,
      })),
    ]
  }

  const subBatches: { id: string; wp_user_id: number }[][] = []
  for (let i = 0; i < withWpUser.length; i += COMPANY_BATCH_SIZE) {
    subBatches.push(withWpUser.slice(i, i + COMPANY_BATCH_SIZE))
  }

  const batchByUserId = new Map<number, BridgeCompanyBatchStudentResult>()
  const batchErrorByUserId = new Map<number, string>()

  await mapWithConcurrency(subBatches, COMPANY_BATCH_CONCURRENCY, async (subBatch) => {
    try {
      const batch = await bridgeCompanyBatchEnrollAndEnsureAccess(
        subBatch.map((employee) => ({ userId: employee.wp_user_id, courseIds })),
      )
      for (const student of batch.students) {
        batchByUserId.set(student.user_id, student)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "No fue posible enrolar el lote en Tutor LMS."

      for (const employee of subBatch) {
        batchErrorByUserId.set(employee.wp_user_id, message)
      }
    }
  })

  const bridgeResults = await mapWithConcurrency(
    withWpUser,
    BATCH_VERIFY_CONCURRENCY,
    async (employee) => {
      const batchError = batchErrorByUserId.get(employee.wp_user_id)
      if (batchError) {
        await markEmployeeCourseAccessError(employee.id, courseIds, deliveryMode, batchError)
        return {
          employeeId: employee.id,
          wpUserId: employee.wp_user_id,
          enrolledCount: 0,
          error: batchError,
        }
      }

      const studentResult = batchByUserId.get(employee.wp_user_id)
      if (!studentResult) {
        const message = "Tutor LMS no devolvio resultado para este alumno en el lote."
        await markEmployeeCourseAccessError(employee.id, courseIds, deliveryMode, message)
        return {
          employeeId: employee.id,
          wpUserId: employee.wp_user_id,
          enrolledCount: 0,
          error: message,
        }
      }

      try {
        assertEnrollmentSucceeded(studentResult, courseIds)
        assertAccessConfirmationSucceeded(studentResult, courseIds)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message.slice(0, 500)
            : "No fue posible confirmar el acceso academico en Tutor LMS."

        await markEmployeeCourseAccessError(employee.id, courseIds, deliveryMode, message)
        return {
          employeeId: employee.id,
          wpUserId: employee.wp_user_id,
          enrolledCount: 0,
          error: message,
        }
      }

      return verifyAndUpsertEmployeeEnrollment(employee, courseIds, courseIdSet, deliveryMode)
    },
  )

  return [...seededResults, ...bridgeResults]
}

export async function enqueuePackageEnrollmentSyncJob(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      packages: {
        where: { active: true },
        orderBy: { created_at: "desc" },
        include: { package: true },
        take: 1,
      },
      employees: {
        where: { active: true },
        select: { id: true },
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

  const employeeIds = company.employees.map((employee) => employee.id)

  const job = await prisma.job.create({
    data: {
      type: "PACKAGE_ENROLLMENT_SYNC",
      payload: {
        companyId: company.id,
        employeeIds,
        processedEmployeeIds: [],
      },
    },
  })

  return {
    jobId: job.id,
    employeeCount: employeeIds.length,
    packageName: activePackage.package.name,
  }
}

export async function markEmployeeCourseAccessError(
  employeeId: string,
  courseIds: number[],
  accessOrigin: string | null | undefined,
  message: string,
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
