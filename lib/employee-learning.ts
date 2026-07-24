import { decodeHtmlEntities } from "@/lib/format"
import { notifyEmployeeNewCertificates } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import {
  bridgeGetStudentCertificates,
  bridgeGetStudentCourses,
  type BridgeStudentCertificate,
  type BridgeStudentCourse,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"
import { after } from "next/server"

function getEmployeeSyncIntervalMs() {
  const rawValue = Number.parseInt(process.env.EMPLOYEE_SYNC_INTERVAL_MS ?? "15000", 10)
  if (!Number.isFinite(rawValue) || rawValue < 15_000) {
    return 15_000
  }

  return rawValue
}

const EMPLOYEE_SYNC_INTERVAL_MS = getEmployeeSyncIntervalMs()
const backgroundSyncsInFlight = new Set<number>()
const backgroundBatchSyncsInFlight = new Set<string>()

export type EmployeeLearningData = Awaited<ReturnType<typeof getEmployeeLearningData>>
export type EmployeeLearningBridgeSnapshot = {
  courses: BridgeStudentCourse[]
  certificates?: BridgeStudentCertificate[]
}

function hasWpCourseId<T extends { wp_course_id?: number | null }>(
  item: T
): item is T & { wp_course_id: number } {
  return Number.isInteger(item.wp_course_id) && Number(item.wp_course_id) > 0
}

function buildCertificateFolio(employeeId: number, courseId: number, completedAt?: string | null) {
  const baseDate = parseBridgeDate(completedAt) ?? new Date()
  const year = baseDate.getUTCFullYear()
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, "0")
  const day = String(baseDate.getUTCDate()).padStart(2, "0")

  return `D360-${year}-${month}${day}-${employeeId}-${courseId}`
}

function parseBridgeDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function deriveCertificatesFromCourses(courses: BridgeStudentCourse[]): BridgeStudentCertificate[] {
  return courses
    .filter((course) => course.completed && course.certificate_url)
    .map((course) => ({
      wp_course_id: course.wp_course_id,
      title: course.title,
      certificate_url: course.certificate_url,
      completed_at: course.completed_at ?? null,
    }))
}

function mergeBridgeCertificates(
  primaryCertificates: BridgeStudentCertificate[],
  fallbackCertificates: BridgeStudentCertificate[]
) {
  const mergedByCourseId = new Map<number, BridgeStudentCertificate>()

  for (const certificate of fallbackCertificates) {
    if (!certificate.wp_course_id) continue
    mergedByCourseId.set(certificate.wp_course_id, certificate)
  }

  for (const certificate of primaryCertificates) {
    if (!certificate.wp_course_id) continue
    mergedByCourseId.set(certificate.wp_course_id, {
      ...mergedByCourseId.get(certificate.wp_course_id),
      ...certificate,
      certificate_url:
        certificate.certificate_url ??
        mergedByCourseId.get(certificate.wp_course_id)?.certificate_url ??
        null,
      completed_at:
        certificate.completed_at ??
        mergedByCourseId.get(certificate.wp_course_id)?.completed_at ??
        null,
    })
  }

  return [...mergedByCourseId.values()].sort((left, right) => {
    return left.title.localeCompare(right.title, "es-MX")
  })
}

async function upsertEmployeeCoursesFromBridge(
  employeeId: number,
  courses: BridgeStudentCourse[]
) {
  const now = new Date()
  const upsertOperations = courses
    .filter(hasWpCourseId)
    .map((course) => {
      const startedAt = parseBridgeDate(course.started_at)
      const completedAt = parseBridgeDate(course.completed_at)

      return prisma.empleadoCurso.upsert({
        where: {
          empleado_id_wp_curso_id: {
            empleado_id: employeeId,
            wp_curso_id: course.wp_course_id,
          },
        },
        update: {
          nombre_curso: decodeHtmlEntities(course.title),
          progreso_pct: course.progress_pct,
          completado: course.completed,
          acceso_estado: "ACTIVE",
          acceso_error: null,
          fecha_inicio_curso: startedAt,
          fecha_completado: completedAt,
          ultima_sincronizacion: now,
        },
        create: {
          empleado_id: employeeId,
          wp_curso_id: course.wp_course_id,
          nombre_curso: decodeHtmlEntities(course.title),
          progreso_pct: course.progress_pct,
          completado: course.completed,
          acceso_estado: "ACTIVE",
          fecha_inicio_curso: startedAt,
          fecha_completado: completedAt,
          ultima_sincronizacion: now,
        },
      })
    })

  if (upsertOperations.length > 0) {
    await prisma.$transaction(upsertOperations)
  }
}

async function upsertEmployeeCertificatesFromBridge(
  employeeId: number,
  certificates: BridgeStudentCertificate[]
) {
  const syncedAt = new Date()
  const existingCertificates = await prisma.constancia.findMany({
    where: { empleado_id: employeeId },
  })

  const certificateByCourseId = new Map(
    existingCertificates.map((certificate) => [certificate.wp_curso_id, certificate])
  )

  const newCertificateCourseTitles: string[] = []

  const operations = certificates
    .filter(hasWpCourseId)
    .map((certificate) => {
      const existingCertificate = certificateByCourseId.get(certificate.wp_course_id)
      const certificateUrl = certificate.certificate_url?.trim() || null
      const issuedAt =
        parseBridgeDate(certificate.completed_at) ??
        existingCertificate?.fecha_emision ??
        syncedAt

      if (existingCertificate) {
        return prisma.constancia.update({
          where: { id: existingCertificate.id },
          data: {
            nombre_curso: decodeHtmlEntities(certificate.title),
            wp_cert_url: certificateUrl ?? existingCertificate.wp_cert_url,
            fecha_emision: issuedAt,
          },
        })
      }

      if (!certificateUrl) {
        return null
      }

      const courseName = decodeHtmlEntities(certificate.title)
      newCertificateCourseTitles.push(courseName)

      return prisma.constancia.create({
        data: {
          empleado_id: employeeId,
          wp_curso_id: certificate.wp_course_id,
          nombre_curso: courseName,
          folio: buildCertificateFolio(employeeId, certificate.wp_course_id, issuedAt.toISOString()),
          wp_cert_url: certificateUrl,
          fecha_emision: issuedAt,
        },
      })
    })
    .filter((operation) => operation !== null)

  if (operations.length > 0) {
    try {
      await prisma.$transaction(operations)
      if (newCertificateCourseTitles.length > 0) {
        await notifyEmployeeNewCertificates(employeeId, newCertificateCourseTitles).catch(() => {})
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err as { code?: string }).code !== "P2002"
      ) {
        throw err
      }
    }
  }

  return operations.length
}

function normalizeBridgeSnapshotCertificates(snapshot: EmployeeLearningBridgeSnapshot) {
  const derivedCertificates = deriveCertificatesFromCourses(snapshot.courses)
  const incomingCertificates = snapshot.certificates ?? []

  return mergeBridgeCertificates(incomingCertificates, derivedCertificates)
}

async function resolveEmployeeIdForLearningSync(input: {
  employeeId?: number | null
  wpUserId?: number | null
}) {
  if (input.employeeId) {
    return input.employeeId
  }

  if (!input.wpUserId) {
    return null
  }

  const employee = await prisma.empleado.findUnique({
    where: { wp_user_id: input.wpUserId },
    select: { id: true },
  })

  return employee?.id ?? null
}

export async function syncEmployeeLearningFromBridgeSnapshot(input: {
  employeeId?: number | null
  wpUserId?: number | null
  snapshot: EmployeeLearningBridgeSnapshot
}) {
  const employeeId = await resolveEmployeeIdForLearningSync({
    employeeId: input.employeeId,
    wpUserId: input.wpUserId,
  })

  if (!employeeId) {
    throw new Error("No fue posible resolver al empleado del portal para aplicar el webhook.")
  }

  const normalizedCertificates = normalizeBridgeSnapshotCertificates(input.snapshot)

  await upsertEmployeeCoursesFromBridge(employeeId, input.snapshot.courses)

  const certificatesUpdated = normalizedCertificates.length > 0
    ? await upsertEmployeeCertificatesFromBridge(employeeId, normalizedCertificates)
    : 0

  return {
    employeeId,
    coursesUpdated: input.snapshot.courses.filter(hasWpCourseId).length,
    certificatesUpdated,
  }
}

export async function syncEmployeeLearningByEmail(
  email: string,
  options?: {
    force?: boolean
  }
) {
  const employee = await fetchEmployeeLearningRecord(email)

  if (!employee) {
    return {
      ok: false,
      synced: false,
      skipped: false,
      employeeId: null,
      companyId: null,
      latestSyncAt: null,
      message: "No se encontro el empleado para sincronizar su avance.",
    }
  }

  const latestSyncAt = getLatestCourseSyncIso(employee.cursos)
  const shouldSync = options?.force || shouldSyncEmployeeLearning(employee)
  if (!shouldSync) {
    return {
      ok: true,
      synced: false,
      skipped: true,
      employeeId: employee.id,
      companyId: employee.empresa_id,
      latestSyncAt,
      message: "El progreso ya esta actualizado recientemente.",
    }
  }

  const result = await syncEmployeeLearningRecord(employee.id)
  const latestSyncedCourse = await prisma.empleadoCurso.findFirst({
    where: { empleado_id: employee.id },
    orderBy: { ultima_sincronizacion: "desc" },
    select: { ultima_sincronizacion: true },
  })

  return {
    ok: true,
    synced: result.synced,
    skipped: false,
    employeeId: employee.id,
    companyId: employee.empresa_id,
    coursesUpdated: result.coursesUpdated,
    certificatesUpdated: result.certificatesUpdated,
    latestSyncAt: latestSyncedCourse?.ultima_sincronizacion.toISOString() ?? latestSyncAt,
  }
}

function shouldSyncEmployeeLearning(employee: {
  wp_user_id: number | null
  cursos: Array<{ ultima_sincronizacion: Date }>
}) {
  if (!employee.wp_user_id || !isWordPressBridgeConfigured()) {
    return false
  }

  const latestSync = getLatestCourseSyncTimestamp(employee.cursos)

  if (!latestSync) {
    return true
  }

  return Date.now() - latestSync >= EMPLOYEE_SYNC_INTERVAL_MS
}

function getLatestCourseSyncTimestamp(courses: Array<{ ultima_sincronizacion: Date }>) {
  return courses.reduce<number>(
    (currentLatest, course) =>
      Math.max(currentLatest, new Date(course.ultima_sincronizacion).getTime()),
    0
  )
}

function getLatestCourseSyncIso(courses: Array<{ ultima_sincronizacion: Date }>) {
  const latestSync = getLatestCourseSyncTimestamp(courses)
  return latestSync ? new Date(latestSync).toISOString() : null
}

async function fetchEmployeeLearningRecord(email: string) {
  return prisma.empleado.findUnique({
    where: { email },
    include: {
      empresa: {
        select: {
          id: true,
          nombre: true,
          rfc: true,
        },
      },
      cursos: {
        orderBy: [
          { completado: "asc" },
          { progreso_pct: "desc" },
          { nombre_curso: "asc" },
        ],
      },
      constancias: {
        orderBy: [{ fecha_emision: "desc" }, { nombre_curso: "asc" }],
      },
    },
  })
}

async function fetchEmployeeLearningRecordById(employeeId: number) {
  return prisma.empleado.findUnique({
    where: { id: employeeId },
    include: {
      empresa: {
        select: {
          id: true,
          nombre: true,
          rfc: true,
        },
      },
      cursos: {
        orderBy: [
          { completado: "asc" },
          { progreso_pct: "desc" },
          { nombre_curso: "asc" },
        ],
      },
      constancias: {
        orderBy: [{ fecha_emision: "desc" }, { nombre_curso: "asc" }],
      },
    },
  })
}

async function syncEmployeeLearningRecord(employeeId: number) {
  const employee = await fetchEmployeeLearningRecordById(employeeId)

  if (!employee || !employee.wp_user_id || !isWordPressBridgeConfigured()) {
    return {
      synced: false,
      bridgeCourses: [] as BridgeStudentCourse[],
      coursesUpdated: 0,
      certificatesUpdated: 0,
    }
  }

  const [coursesResult, certificatesResult] = await Promise.allSettled([
    bridgeGetStudentCourses(employee.wp_user_id),
    bridgeGetStudentCertificates(employee.wp_user_id),
  ])

  if (coursesResult.status !== "fulfilled") {
    throw coursesResult.reason
  }

  const bridgeCourses = coursesResult.value
  const appliedSnapshot = await syncEmployeeLearningFromBridgeSnapshot({
    employeeId: employee.id,
    snapshot: {
      courses: bridgeCourses.courses,
      certificates:
        certificatesResult.status === "fulfilled"
          ? certificatesResult.value.certificates
          : undefined,
    },
  })

  return {
    synced: true,
    bridgeCourses: bridgeCourses.courses,
    coursesUpdated: appliedSnapshot.coursesUpdated,
    certificatesUpdated: appliedSnapshot.certificatesUpdated,
  }
}

function scheduleEmployeeLearningSync(employeeId: number) {
  if (!employeeId || backgroundSyncsInFlight.has(employeeId)) {
    return false
  }

  backgroundSyncsInFlight.add(employeeId)

  after(async () => {
    try {
      await syncEmployeeLearningRecord(employeeId)
    } catch (error) {
      console.error("Background employee learning sync failed", {
        employeeId,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      backgroundSyncsInFlight.delete(employeeId)
    }
  })

  return true
}

export async function syncStaleEmployeeLearningBatch(options?: {
  limit?: number
}) {
  return syncEmployeeLearningBatchInternal({
    limit: options?.limit,
    staleOnly: true,
  })
}

export async function syncCompanyEmployeeLearningBatch(
  companyId: number,
  options?: {
    limit?: number
    staleOnly?: boolean
  }
) {
  return syncEmployeeLearningBatchInternal({
    companyId,
    limit: options?.limit,
    staleOnly: options?.staleOnly ?? false,
  })
}

async function syncEmployeeLearningBatchInternal(options?: {
  companyId?: number
  limit?: number
  staleOnly?: boolean
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
  const staleOnly = options?.staleOnly ?? true
  const activeEmployees = await prisma.empleado.findMany({
    where: {
      activo: true,
      wp_user_id: { not: null },
      ...(options?.companyId ? { empresa_id: options.companyId } : {}),
    },
    select: {
      id: true,
      empresa_id: true,
      wp_user_id: true,
      cursos: {
        select: {
          ultima_sincronizacion: true,
        },
        orderBy: {
          ultima_sincronizacion: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      id: "asc",
    },
  })

  const selectedEmployees = (staleOnly ? activeEmployees.filter((employee) =>
      shouldSyncEmployeeLearning({
        wp_user_id: employee.wp_user_id,
        cursos: employee.cursos,
      })
    ) : activeEmployees)
    .filter((employee) =>
      options?.companyId ? employee.empresa_id === options.companyId : true
    )
    .slice(0, limit)

  const results: Array<{
    employeeId: number
    status: "synced" | "failed"
    message?: string
  }> = []

  for (const employee of selectedEmployees) {
    try {
      await syncEmployeeLearningRecord(employee.id)
      results.push({
        employeeId: employee.id,
        status: "synced",
      })
    } catch (error) {
      results.push({
        employeeId: employee.id,
        status: "failed",
        message: error instanceof Error ? error.message.slice(0, 240) : "Unknown sync error",
      })
    }
  }

  return {
    scanned: activeEmployees.length,
    queued: selectedEmployees.length,
    results,
  }
}

export function scheduleStaleEmployeeLearningBatch(options?: {
  limit?: number
}) {
  return scheduleEmployeeLearningBatch({
    key: `stale:${Math.max(1, Math.min(options?.limit ?? 25, 100))}`,
    runner: () =>
      syncEmployeeLearningBatchInternal({
        limit: options?.limit,
        staleOnly: true,
      }),
  })
}

export function scheduleCompanyEmployeeLearningBatch(
  companyId: number,
  options?: {
    limit?: number
    staleOnly?: boolean
  }
) {
  if (!companyId) {
    return false
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
  const staleOnly = options?.staleOnly ?? false

  return scheduleEmployeeLearningBatch({
    key: `company:${companyId}:${staleOnly ? "stale" : "all"}:${limit}`,
    runner: () =>
      syncEmployeeLearningBatchInternal({
        companyId,
        limit,
        staleOnly,
      }),
  })
}

function scheduleEmployeeLearningBatch(options: {
  key: string
  runner: () => Promise<unknown>
}) {
  if (backgroundBatchSyncsInFlight.has(options.key)) {
    return false
  }

  backgroundBatchSyncsInFlight.add(options.key)

  after(async () => {
    try {
      await options.runner()
    } catch (error) {
      console.error("Background employee learning batch sync failed", {
        key: options.key,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      backgroundBatchSyncsInFlight.delete(options.key)
    }
  })

  return true
}

function mergeEmployeeCoursesWithBridgeData(
  employee: NonNullable<Awaited<ReturnType<typeof fetchEmployeeLearningRecord>>>,
  bridgeCourses: BridgeStudentCourse[]
) {
  if (bridgeCourses.length === 0) {
    return employee
  }

  const syncedAt = new Date()
  const bridgeCourseById = new Map(bridgeCourses.map((course) => [course.wp_course_id, course]))
  const mergedCourses = employee.cursos
    .map((course) => {
      const bridgeCourse = bridgeCourseById.get(course.wp_curso_id)
      if (!bridgeCourse) {
        return course
      }

      return {
        ...course,
        nombre_curso: decodeHtmlEntities(bridgeCourse.title || course.nombre_curso),
        progreso_pct: bridgeCourse.progress_pct,
        completado: bridgeCourse.completed,
        fecha_inicio_curso: parseBridgeDate(bridgeCourse.started_at) ?? course.fecha_inicio_curso,
        fecha_completado: bridgeCourse.completed ? parseBridgeDate(bridgeCourse.completed_at) : null,
        ultima_sincronizacion: syncedAt,
      }
    })
    .sort((left, right) => {
      if (left.completado !== right.completado) {
        return left.completado ? 1 : -1
      }

      if (left.progreso_pct !== right.progreso_pct) {
        return right.progreso_pct - left.progreso_pct
      }

      return left.nombre_curso.localeCompare(right.nombre_curso, "es-MX")
    })

  return {
    ...employee,
    cursos: mergedCourses,
  }
}

export async function getEmployeeLearningData(
  email: string,
  options?: {
    forceSync?: boolean
  }
) {
  let employee = await fetchEmployeeLearningRecord(email)

  if (!employee) {
    return null
  }

  let syncError: string | null = null
  let syncedFromBridge = false
  let latestBridgeCourses: BridgeStudentCourse[] = []
  let backgroundSyncQueued = false

  const forceSync = options?.forceSync ?? false

  const needsSync = shouldSyncEmployeeLearning(employee)

  if (forceSync && needsSync) {
    try {
      const result = await syncEmployeeLearningRecord(employee.id)
      latestBridgeCourses = result.bridgeCourses
      syncedFromBridge = result.synced
      employee = await fetchEmployeeLearningRecord(email)
    } catch (error) {
      syncError =
        error instanceof Error
          ? error.message.slice(0, 240)
          : "No fue posible refrescar el progreso del alumno desde Tutor LMS."
    }
  } else if (needsSync) {
    backgroundSyncQueued = scheduleEmployeeLearningSync(employee.id)
  }

  if (!employee) {
    return null
  }

  employee = mergeEmployeeCoursesWithBridgeData(employee, latestBridgeCourses)

  const completedCourseIds = new Set(employee.constancias.map((certificate) => certificate.wp_curso_id))
  const pendingCertificates = employee.cursos.filter(
    (course) => course.completado && !completedCourseIds.has(course.wp_curso_id)
  )

  return {
    employee,
    pendingCertificates,
    syncedFromBridge,
    backgroundSyncQueued,
    syncError,
  }
}
