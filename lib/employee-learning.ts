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

function buildCertificateFolio(empleadoId: number, courseId: number, completedAt?: string | null) {
  const baseDate = parseBridgeDate(completedAt) ?? new Date()
  const year = baseDate.getUTCFullYear()
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, "0")
  const day = String(baseDate.getUTCDate()).padStart(2, "0")

  return `D360-${year}-${month}${day}-${empleadoId}-${courseId}`
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
  empleadoId: number,
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
            empleado_id: empleadoId,
            wp_curso_id: course.wp_course_id,
          },
        },
        update: {
          nombre_curso: course.title,
          progreso_pct: course.progress_pct,
          completado: course.completed,
          acceso_estado: "ACTIVE",
          acceso_error: null,
          fecha_inicio_curso: startedAt,
          fecha_completado: completedAt,
          ultima_sincronizacion: now,
        },
        create: {
          empleado_id: empleadoId,
          wp_curso_id: course.wp_course_id,
          nombre_curso: course.title,
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
  empleadoId: number,
  certificates: BridgeStudentCertificate[]
) {
  const syncedAt = new Date()
  const existingCertificates = await prisma.constancia.findMany({
    where: { empleado_id: empleadoId },
  })

  const certificateByCourseId = new Map(
    existingCertificates.map((certificate) => [certificate.wp_curso_id, certificate])
  )

  const operations = certificates
    .filter(hasWpCourseId)
    .map((certificate) => {
      const existingCertificate = certificateByCourseId.get(certificate.wp_course_id)
      const certificateUrl = certificate.certificate_url?.trim() || null
      const fechaEmision =
        parseBridgeDate(certificate.completed_at) ??
        existingCertificate?.fecha_emision ??
        syncedAt

      if (existingCertificate) {
        return prisma.constancia.update({
          where: { id: existingCertificate.id },
          data: {
            nombre_curso: certificate.title,
            wp_cert_url: certificateUrl ?? existingCertificate.wp_cert_url,
            fecha_emision: fechaEmision,
          },
        })
      }

      if (!certificateUrl) {
        return null
      }

      return prisma.constancia.create({
        data: {
          empleado_id: empleadoId,
          wp_curso_id: certificate.wp_course_id,
          nombre_curso: certificate.title,
          folio: buildCertificateFolio(empleadoId, certificate.wp_course_id, fechaEmision.toISOString()),
          wp_cert_url: certificateUrl,
          fecha_emision: fechaEmision,
        },
      })
    })
    .filter((operation) => operation !== null)

  if (operations.length > 0) {
    await prisma.$transaction(operations)
  }

  return operations.length
}

function normalizeBridgeSnapshotCertificates(snapshot: EmployeeLearningBridgeSnapshot) {
  const derivedCertificates = deriveCertificatesFromCourses(snapshot.courses)
  const incomingCertificates = snapshot.certificates ?? []

  return mergeBridgeCertificates(incomingCertificates, derivedCertificates)
}

async function resolveEmployeeIdForLearningSync(input: {
  empleadoId?: number | null
  wpUserId?: number | null
}) {
  if (input.empleadoId) {
    return input.empleadoId
  }

  if (!input.wpUserId) {
    return null
  }

  const empleado = await prisma.empleado.findUnique({
    where: { wp_user_id: input.wpUserId },
    select: { id: true },
  })

  return empleado?.id ?? null
}

export async function syncEmployeeLearningFromBridgeSnapshot(input: {
  empleadoId?: number | null
  wpUserId?: number | null
  snapshot: EmployeeLearningBridgeSnapshot
}) {
  const empleadoId = await resolveEmployeeIdForLearningSync({
    empleadoId: input.empleadoId,
    wpUserId: input.wpUserId,
  })

  if (!empleadoId) {
    throw new Error("No fue posible resolver al empleado del portal para aplicar el webhook.")
  }

  const normalizedCertificates = normalizeBridgeSnapshotCertificates(input.snapshot)

  await upsertEmployeeCoursesFromBridge(empleadoId, input.snapshot.courses)

  const certificatesUpdated = normalizedCertificates.length > 0
    ? await upsertEmployeeCertificatesFromBridge(empleadoId, normalizedCertificates)
    : 0

  return {
    empleadoId,
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
  const empleado = await fetchEmployeeLearningRecord(email)

  if (!empleado) {
    return {
      ok: false,
      synced: false,
      skipped: false,
      empleadoId: null,
      empresaId: null,
      latestSyncAt: null,
      message: "No se encontro el empleado para sincronizar su avance.",
    }
  }

  const latestSyncAt = getLatestCourseSyncIso(empleado.cursos)
  const shouldSync = options?.force || shouldSyncEmployeeLearning(empleado)
  if (!shouldSync) {
    return {
      ok: true,
      synced: false,
      skipped: true,
      empleadoId: empleado.id,
      empresaId: empleado.empresa_id,
      latestSyncAt,
      message: "El progreso ya esta actualizado recientemente.",
    }
  }

  const result = await syncEmployeeLearningRecord(empleado.id)
  const latestSyncedCourse = await prisma.empleadoCurso.findFirst({
    where: { empleado_id: empleado.id },
    orderBy: { ultima_sincronizacion: "desc" },
    select: { ultima_sincronizacion: true },
  })

  return {
    ok: true,
    synced: result.synced,
    skipped: false,
    empleadoId: empleado.id,
    empresaId: empleado.empresa_id,
    coursesUpdated: result.coursesUpdated,
    certificatesUpdated: result.certificatesUpdated,
    latestSyncAt: latestSyncedCourse?.ultima_sincronizacion.toISOString() ?? latestSyncAt,
  }
}

function shouldSyncEmployeeLearning(empleado: {
  wp_user_id: number | null
  cursos: Array<{ ultima_sincronizacion: Date }>
}) {
  if (!empleado.wp_user_id || !isWordPressBridgeConfigured()) {
    return false
  }

  const latestSync = getLatestCourseSyncTimestamp(empleado.cursos)

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

async function fetchEmployeeLearningRecordById(empleadoId: number) {
  return prisma.empleado.findUnique({
    where: { id: empleadoId },
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

async function syncEmployeeLearningRecord(empleadoId: number) {
  const empleado = await fetchEmployeeLearningRecordById(empleadoId)

  if (!empleado || !empleado.wp_user_id || !isWordPressBridgeConfigured()) {
    return {
      synced: false,
      bridgeCourses: [] as BridgeStudentCourse[],
      coursesUpdated: 0,
      certificatesUpdated: 0,
    }
  }

  const [coursesResult, certificatesResult] = await Promise.allSettled([
    bridgeGetStudentCourses(empleado.wp_user_id),
    bridgeGetStudentCertificates(empleado.wp_user_id),
  ])

  if (coursesResult.status !== "fulfilled") {
    throw coursesResult.reason
  }

  const bridgeCourses = coursesResult.value
  const appliedSnapshot = await syncEmployeeLearningFromBridgeSnapshot({
    empleadoId: empleado.id,
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

function scheduleEmployeeLearningSync(empleadoId: number) {
  if (!empleadoId || backgroundSyncsInFlight.has(empleadoId)) {
    return false
  }

  backgroundSyncsInFlight.add(empleadoId)

  after(async () => {
    try {
      await syncEmployeeLearningRecord(empleadoId)
    } catch (error) {
      console.error("Background employee learning sync failed", {
        empleadoId,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      backgroundSyncsInFlight.delete(empleadoId)
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
  empresaId: number,
  options?: {
    limit?: number
    staleOnly?: boolean
  }
) {
  return syncEmployeeLearningBatchInternal({
    empresaId,
    limit: options?.limit,
    staleOnly: options?.staleOnly ?? false,
  })
}

async function syncEmployeeLearningBatchInternal(options?: {
  empresaId?: number
  limit?: number
  staleOnly?: boolean
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
  const staleOnly = options?.staleOnly ?? true
  const activeEmployees = await prisma.empleado.findMany({
    where: {
      activo: true,
      wp_user_id: { not: null },
      ...(options?.empresaId ? { empresa_id: options.empresaId } : {}),
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

  const selectedEmployees = (staleOnly ? activeEmployees.filter((empleado) =>
      shouldSyncEmployeeLearning({
        wp_user_id: empleado.wp_user_id,
        cursos: empleado.cursos,
      })
    ) : activeEmployees)
    .filter((empleado) =>
      options?.empresaId ? empleado.empresa_id === options.empresaId : true
    )
    .slice(0, limit)

  const results: Array<{
    empleadoId: number
    status: "synced" | "failed"
    message?: string
  }> = []

  for (const empleado of selectedEmployees) {
    try {
      await syncEmployeeLearningRecord(empleado.id)
      results.push({
        empleadoId: empleado.id,
        status: "synced",
      })
    } catch (error) {
      results.push({
        empleadoId: empleado.id,
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
  empresaId: number,
  options?: {
    limit?: number
    staleOnly?: boolean
  }
) {
  if (!empresaId) {
    return false
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
  const staleOnly = options?.staleOnly ?? false

  return scheduleEmployeeLearningBatch({
    key: `empresa:${empresaId}:${staleOnly ? "stale" : "all"}:${limit}`,
    runner: () =>
      syncEmployeeLearningBatchInternal({
        empresaId,
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
  empleado: NonNullable<Awaited<ReturnType<typeof fetchEmployeeLearningRecord>>>,
  bridgeCourses: BridgeStudentCourse[]
) {
  if (bridgeCourses.length === 0) {
    return empleado
  }

  const syncedAt = new Date()
  const bridgeCourseById = new Map(bridgeCourses.map((course) => [course.wp_course_id, course]))
  const mergedCourses = empleado.cursos
    .map((curso) => {
      const bridgeCourse = bridgeCourseById.get(curso.wp_curso_id)
      if (!bridgeCourse) {
        return curso
      }

      return {
        ...curso,
        nombre_curso: bridgeCourse.title || curso.nombre_curso,
        progreso_pct: bridgeCourse.progress_pct,
        completado: bridgeCourse.completed,
        fecha_inicio_curso: parseBridgeDate(bridgeCourse.started_at) ?? curso.fecha_inicio_curso,
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
    ...empleado,
    cursos: mergedCourses,
  }
}

export async function getEmployeeLearningData(
  email: string,
  options?: {
    forceSync?: boolean
  }
) {
  let empleado = await fetchEmployeeLearningRecord(email)

  if (!empleado) {
    return null
  }

  let syncError: string | null = null
  let syncedFromBridge = false
  let latestBridgeCourses: BridgeStudentCourse[] = []
  let backgroundSyncQueued = false

  const forceSync = options?.forceSync ?? false

  const needsSync = shouldSyncEmployeeLearning(empleado)

  if (forceSync && needsSync) {
    try {
      const result = await syncEmployeeLearningRecord(empleado.id)
      latestBridgeCourses = result.bridgeCourses
      syncedFromBridge = result.synced
      empleado = await fetchEmployeeLearningRecord(email)
    } catch (error) {
      syncError =
        error instanceof Error
          ? error.message.slice(0, 240)
          : "No fue posible refrescar el progreso del alumno desde Tutor LMS."
    }
  } else if (needsSync) {
    backgroundSyncQueued = scheduleEmployeeLearningSync(empleado.id)
  }

  if (!empleado) {
    return null
  }

  empleado = mergeEmployeeCoursesWithBridgeData(empleado, latestBridgeCourses)

  const completedCourseIds = new Set(empleado.constancias.map((certificate) => certificate.wp_curso_id))
  const pendingCertificates = empleado.cursos.filter(
    (course) => course.completado && !completedCourseIds.has(course.wp_curso_id)
  )

  return {
    empleado,
    pendingCertificates,
    syncedFromBridge,
    backgroundSyncQueued,
    syncError,
  }
}
