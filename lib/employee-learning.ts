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
const SYNC_LOCK_DURATION_MS = 120_000
const backgroundBatchSyncsInFlight = new Set<string>()

async function claimEmployeeSyncLock(employeeId: string) {
  const now = new Date()
  const lockUntil = new Date(now.getTime() + SYNC_LOCK_DURATION_MS)

  const claim = await prisma.employee.updateMany({
    where: {
      id: employeeId,
      OR: [{ sync_lock_until: null }, { sync_lock_until: { lt: now } }],
    },
    data: { sync_lock_until: lockUntil },
  })

  return claim.count > 0 ? lockUntil : null
}

async function releaseEmployeeSyncLock(employeeId: string, lockUntil: Date) {
  await prisma.employee.updateMany({
    where: { id: employeeId, sync_lock_until: lockUntil },
    data: { sync_lock_until: null },
  })
}

export type EmployeeLearningBridgeSnapshot = {
  courses: BridgeStudentCourse[]
  certificates?: BridgeStudentCertificate[]
}

function hasWpCourseId<T extends { wp_course_id?: number | null }>(
  item: T,
): item is T & { wp_course_id: number } {
  return Number.isInteger(item.wp_course_id) && Number(item.wp_course_id) > 0
}

function buildCertificateFolio(
  folioSequence: number,
  courseId: number,
  completedAt?: string | null,
) {
  const baseDate = parseBridgeDate(completedAt) ?? new Date()
  const year = baseDate.getUTCFullYear()
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, "0")
  const day = String(baseDate.getUTCDate()).padStart(2, "0")
  const paddedFolioSequence = String(folioSequence).padStart(6, "0")

  return `D360-${year}-${month}${day}-${paddedFolioSequence}-${courseId}`
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
    .filter((course) => course.completed)
    .map((course) => ({
      wp_course_id: course.wp_course_id,
      title: course.title,
      certificate_url: course.certificate_url ?? null,
      completed_at: course.completed_at ?? null,
    }))
}

function mergeBridgeCertificates(
  primaryCertificates: BridgeStudentCertificate[],
  fallbackCertificates: BridgeStudentCertificate[],
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

function sameInstant(left: Date | null | undefined, right: Date | null | undefined) {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null)
}

async function upsertEmployeeCoursesFromBridge(employeeId: string, courses: BridgeStudentCourse[]) {
  const incoming = courses.filter(hasWpCourseId)
  if (incoming.length === 0) return 0

  const existing = await prisma.employeeCourse.findMany({ where: { employee_id: employeeId } })
  const existingByCourseId = new Map(existing.map((row) => [row.wp_course_id, row]))

  const now = new Date()
  const upsertOperations = incoming.flatMap((course) => {
    const startedAt = parseBridgeDate(course.started_at)
    const completedAt = parseBridgeDate(course.completed_at)
    const current = existingByCourseId.get(course.wp_course_id)

    if (
      current &&
      current.course_name === decodeHtmlEntities(course.title) &&
      current.progress_pct === course.progress_pct &&
      current.completed === course.completed &&
      current.access_status === "ACTIVE" &&
      current.access_error === null &&
      sameInstant(current.course_start_date, startedAt) &&
      sameInstant(current.completed_at, completedAt)
    ) {
      return []
    }

    return prisma.employeeCourse.upsert({
      where: {
        employee_id_wp_course_id: {
          employee_id: employeeId,
          wp_course_id: course.wp_course_id,
        },
      },
      update: {
        course_name: decodeHtmlEntities(course.title),
        progress_pct: course.progress_pct,
        completed: course.completed,
        access_status: "ACTIVE",
        access_error: null,
        course_start_date: startedAt,
        completed_at: completedAt,
        last_synced_at: now,
      },
      create: {
        employee_id: employeeId,
        wp_course_id: course.wp_course_id,
        course_name: decodeHtmlEntities(course.title),
        progress_pct: course.progress_pct,
        completed: course.completed,
        access_status: "ACTIVE",
        course_start_date: startedAt,
        completed_at: completedAt,
        last_synced_at: now,
      },
    })
  })

  if (upsertOperations.length > 0) {
    await prisma.$transaction(upsertOperations)
  }

  return upsertOperations.length
}

async function upsertQuizAttemptsFromBridge(employeeId: string, courses: BridgeStudentCourse[]) {
  const incoming = courses
    .filter(hasWpCourseId)
    .flatMap((course) => (course.quiz_attempts ?? []).map((attempt) => ({ course, attempt })))
  if (incoming.length === 0) return 0

  const existing = await prisma.quizAttempt.findMany({ where: { employee_id: employeeId } })
  const existingByAttemptId = new Map(existing.map((row) => [row.wp_attempt_id, row]))

  const now = new Date()
  const upsertOperations = incoming.flatMap(({ course, attempt }) => {
    const current = existingByAttemptId.get(attempt.attempt_id)
    const quizName = attempt.quiz_name ? decodeHtmlEntities(attempt.quiz_name) : null

    if (
      current &&
      current.quiz_name === quizName &&
      current.total_questions === attempt.total_questions &&
      current.total_answered_questions === attempt.total_answered_questions &&
      current.total_marks === attempt.total_marks &&
      current.earned_marks === attempt.earned_marks &&
      current.attempt_status === attempt.attempt_status &&
      current.result === attempt.result &&
      sameInstant(current.attempt_started_at, parseBridgeDate(attempt.attempt_started_at)) &&
      sameInstant(current.attempt_ended_at, parseBridgeDate(attempt.attempt_ended_at))
    ) {
      return []
    }

    return prisma.quizAttempt.upsert({
      where: { wp_attempt_id: attempt.attempt_id },
      update: {
        quiz_name: attempt.quiz_name ? decodeHtmlEntities(attempt.quiz_name) : null,
        total_questions: attempt.total_questions,
        total_answered_questions: attempt.total_answered_questions,
        total_marks: attempt.total_marks,
        earned_marks: attempt.earned_marks,
        attempt_status: attempt.attempt_status,
        result: attempt.result,
        attempt_started_at: parseBridgeDate(attempt.attempt_started_at),
        attempt_ended_at: parseBridgeDate(attempt.attempt_ended_at),
        last_synced_at: now,
      },
      create: {
        employee_id: employeeId,
        wp_course_id: course.wp_course_id,
        wp_quiz_id: attempt.quiz_id,
        wp_attempt_id: attempt.attempt_id,
        quiz_name: attempt.quiz_name ? decodeHtmlEntities(attempt.quiz_name) : null,
        total_questions: attempt.total_questions,
        total_answered_questions: attempt.total_answered_questions,
        total_marks: attempt.total_marks,
        earned_marks: attempt.earned_marks,
        attempt_status: attempt.attempt_status,
        result: attempt.result,
        attempt_started_at: parseBridgeDate(attempt.attempt_started_at),
        attempt_ended_at: parseBridgeDate(attempt.attempt_ended_at),
        last_synced_at: now,
      },
    })
  })

  if (upsertOperations.length > 0) {
    await prisma.$transaction(upsertOperations)
  }

  return upsertOperations.length
}

async function upsertLessonCompletionsFromBridge(
  employeeId: string,
  courses: BridgeStudentCourse[],
) {
  const incoming = courses
    .filter(hasWpCourseId)
    .flatMap((course) =>
      (course.lesson_completions ?? []).map((completion) => ({ course, completion })),
    )
  if (incoming.length === 0) return 0

  const existing = await prisma.lessonCompletion.findMany({ where: { employee_id: employeeId } })
  const existingByLessonId = new Map(existing.map((row) => [row.wp_lesson_id, row]))

  const now = new Date()
  const upsertOperations = incoming.flatMap(({ course, completion }) => {
    const current = existingByLessonId.get(completion.wp_lesson_id)
    const lessonName = completion.title ? decodeHtmlEntities(completion.title) : null

    if (
      current &&
      current.wp_course_id === course.wp_course_id &&
      current.lesson_name === lessonName &&
      sameInstant(current.completed_at, parseBridgeDate(completion.completed_at))
    ) {
      return []
    }

    return prisma.lessonCompletion.upsert({
      where: {
        employee_id_wp_lesson_id: {
          employee_id: employeeId,
          wp_lesson_id: completion.wp_lesson_id,
        },
      },
      update: {
        wp_course_id: course.wp_course_id,
        lesson_name: completion.title ? decodeHtmlEntities(completion.title) : null,
        completed_at: parseBridgeDate(completion.completed_at),
        last_synced_at: now,
      },
      create: {
        employee_id: employeeId,
        wp_course_id: course.wp_course_id,
        wp_lesson_id: completion.wp_lesson_id,
        lesson_name: completion.title ? decodeHtmlEntities(completion.title) : null,
        completed_at: parseBridgeDate(completion.completed_at),
        last_synced_at: now,
      },
    })
  })

  if (upsertOperations.length > 0) {
    await prisma.$transaction(upsertOperations)
  }

  return upsertOperations.length
}

// El throttle de sincronización se mide con last_synced_at de los cursos. Como
// ahora solo se escriben las filas que cambiaron, hay que avanzar la marca
// aparte o una sincronización sin novedades se repetiría en cada poll.
async function touchEmployeeCoursesSyncedAt(employeeId: string) {
  await prisma.employeeCourse.updateMany({
    where: { employee_id: employeeId },
    data: { last_synced_at: new Date() },
  })
}

async function upsertEmployeeCertificatesFromBridge(
  employeeId: string,
  certificates: BridgeStudentCertificate[],
) {
  const syncedAt = new Date()
  const existingCertificates = await prisma.certificate.findMany({
    where: { employee_id: employeeId },
  })

  const certificateByCourseId = new Map(
    existingCertificates.map((certificate) => [certificate.wp_course_id, certificate]),
  )

  const newCertificatesToNotify: { courseName: string; certificateUrl: string }[] = []

  const operations: Array<
    ReturnType<typeof prisma.certificate.update> | ReturnType<typeof prisma.certificate.create>
  > = []

  for (const certificate of certificates.filter(hasWpCourseId)) {
    const existingCertificate = certificateByCourseId.get(certificate.wp_course_id)
    const certificateUrl = certificate.certificate_url?.trim() || null
    const issuedAt =
      parseBridgeDate(certificate.completed_at) ?? existingCertificate?.issued_at ?? syncedAt

    if (existingCertificate) {
      if (
        existingCertificate.course_name === decodeHtmlEntities(certificate.title) &&
        existingCertificate.certificate_url ===
          (certificateUrl ?? existingCertificate.certificate_url) &&
        sameInstant(existingCertificate.issued_at, issuedAt)
      ) {
        continue
      }

      operations.push(
        prisma.certificate.update({
          where: { id: existingCertificate.id },
          data: {
            course_name: decodeHtmlEntities(certificate.title),
            certificate_url: certificateUrl ?? existingCertificate.certificate_url,
            issued_at: issuedAt,
          },
        }),
      )
      continue
    }

    const courseName = decodeHtmlEntities(certificate.title)
    if (certificateUrl) {
      newCertificatesToNotify.push({ courseName, certificateUrl })
    }

    const [{ nextval }] = await prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('certificates_folio_sequence_seq') AS nextval`
    const folioSequence = Number(nextval)

    operations.push(
      prisma.certificate.create({
        data: {
          employee_id: employeeId,
          wp_course_id: certificate.wp_course_id,
          course_name: courseName,
          folio_sequence: folioSequence,
          reference_number: buildCertificateFolio(
            folioSequence,
            certificate.wp_course_id,
            issuedAt.toISOString(),
          ),
          certificate_url: certificateUrl,
          issued_at: issuedAt,
        },
      }),
    )
  }

  if (operations.length > 0) {
    try {
      await prisma.$transaction(operations)
      if (newCertificatesToNotify.length > 0) {
        await notifyEmployeeNewCertificates(employeeId, newCertificatesToNotify).catch(() => {})
      }
    } catch (err) {
      if (err instanceof Error && (err as { code?: string }).code !== "P2002") {
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
  employeeId?: string | null
  wpUserId?: number | null
}) {
  if (input.wpUserId) {
    const employee = await prisma.employee.findUnique({
      where: { wp_user_id: input.wpUserId },
      select: { id: true },
    })

    if (employee) {
      return employee.id
    }
  }

  return input.employeeId ?? null
}

export async function syncEmployeeLearningFromBridgeSnapshot(input: {
  employeeId?: string | null
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

  const coursesUpdated = await upsertEmployeeCoursesFromBridge(employeeId, input.snapshot.courses)
  const quizAttemptsUpdated = await upsertQuizAttemptsFromBridge(employeeId, input.snapshot.courses)
  const lessonsUpdated = await upsertLessonCompletionsFromBridge(employeeId, input.snapshot.courses)

  const certificatesUpdated =
    normalizedCertificates.length > 0
      ? await upsertEmployeeCertificatesFromBridge(employeeId, normalizedCertificates)
      : 0

  await touchEmployeeCoursesSyncedAt(employeeId)

  return {
    employeeId,
    coursesUpdated,
    certificatesUpdated,
    changed: coursesUpdated + quizAttemptsUpdated + lessonsUpdated + certificatesUpdated,
  }
}

export async function syncEmployeeLearningByEmail(
  email: string,
  options?: {
    force?: boolean
  },
) {
  // Este es el poll de cada pestaña abierta: solo necesita decidir si toca
  // sincronizar, así que no trae el árbol completo de cursos y constancias.
  const employee = await prisma.employee.findUnique({
    where: { email },
    select: {
      id: true,
      company_id: true,
      wp_user_id: true,
      courses: { select: { last_synced_at: true } },
    },
  })

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

  const latestSyncAt = getLatestCourseSyncIso(employee.courses)
  const shouldSync = options?.force || shouldSyncEmployeeLearning(employee)
  if (!shouldSync) {
    return {
      ok: true,
      synced: false,
      skipped: true,
      employeeId: employee.id,
      companyId: employee.company_id,
      latestSyncAt,
      message: "El progreso ya esta actualizado recientemente.",
    }
  }

  const result = await syncEmployeeLearningRecord(employee.id, {
    id: employee.id,
    wp_user_id: employee.wp_user_id,
  })
  const latestSyncedCourse = await prisma.employeeCourse.findFirst({
    where: { employee_id: employee.id },
    orderBy: { last_synced_at: "desc" },
    select: { last_synced_at: true },
  })

  return {
    ok: true,
    synced: result.synced,
    skipped: false,
    employeeId: employee.id,
    companyId: employee.company_id,
    coursesUpdated: result.coursesUpdated,
    certificatesUpdated: result.certificatesUpdated,
    changed: result.changed,
    latestSyncAt: latestSyncedCourse?.last_synced_at.toISOString() ?? latestSyncAt,
  }
}

function shouldSyncEmployeeLearning(employee: {
  wp_user_id: number | null
  courses: Array<{ last_synced_at: Date }>
}) {
  if (!employee.wp_user_id || !isWordPressBridgeConfigured()) {
    return false
  }

  const latestSync = getLatestCourseSyncTimestamp(employee.courses)

  if (!latestSync) {
    return true
  }

  return Date.now() - latestSync >= EMPLOYEE_SYNC_INTERVAL_MS
}

function getLatestCourseSyncTimestamp(courses: Array<{ last_synced_at: Date }>) {
  return courses.reduce<number>(
    (currentLatest, course) => Math.max(currentLatest, new Date(course.last_synced_at).getTime()),
    0,
  )
}

function getLatestCourseSyncIso(courses: Array<{ last_synced_at: Date }>) {
  const latestSync = getLatestCourseSyncTimestamp(courses)
  return latestSync ? new Date(latestSync).toISOString() : null
}

async function fetchEmployeeLearningRecord(email: string) {
  return prisma.employee.findUnique({
    where: { email },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          rfc: true,
        },
      },
      courses: {
        orderBy: [{ completed: "asc" }, { progress_pct: "desc" }, { course_name: "asc" }],
      },
      certificates: {
        orderBy: [{ issued_at: "desc" }, { course_name: "asc" }],
      },
    },
  })
}

async function fetchEmployeeLearningRecordById(employeeId: string) {
  return prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          rfc: true,
        },
      },
      courses: {
        orderBy: [{ completed: "asc" }, { progress_pct: "desc" }, { course_name: "asc" }],
      },
      certificates: {
        orderBy: [{ issued_at: "desc" }, { course_name: "asc" }],
      },
    },
  })
}

async function syncEmployeeLearningRecord(
  employeeId: string,
  known?: { id: string; wp_user_id: number | null },
) {
  const employee = known ?? (await fetchEmployeeLearningRecordById(employeeId))

  if (!employee || !employee.wp_user_id || !isWordPressBridgeConfigured()) {
    return {
      synced: false,
      bridgeCourses: [] as BridgeStudentCourse[],
      coursesUpdated: 0,
      certificatesUpdated: 0,
      changed: 0,
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
    changed: appliedSnapshot.changed,
  }
}

async function scheduleEmployeeLearningSync(employeeId: string) {
  if (!employeeId) {
    return false
  }

  const lockUntil = await claimEmployeeSyncLock(employeeId)
  if (!lockUntil) {
    return false
  }

  after(async () => {
    try {
      await syncEmployeeLearningRecord(employeeId)
    } catch (error) {
      console.error("Background employee learning sync failed", {
        employeeId,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      await releaseEmployeeSyncLock(employeeId, lockUntil)
    }
  })

  return true
}

export async function syncStaleEmployeeLearningBatch(options?: { limit?: number }) {
  return syncEmployeeLearningBatchInternal({
    limit: options?.limit,
    staleOnly: true,
  })
}

async function syncEmployeeLearningBatchInternal(options?: {
  companyId?: string
  limit?: number
  staleOnly?: boolean
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
  const staleOnly = options?.staleOnly ?? true
  const activeEmployees = await prisma.employee.findMany({
    where: {
      active: true,
      wp_user_id: { not: null },
      ...(options?.companyId ? { company_id: options.companyId } : {}),
    },
    select: {
      id: true,
      company_id: true,
      wp_user_id: true,
      courses: {
        select: {
          last_synced_at: true,
        },
        orderBy: {
          last_synced_at: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      id: "asc",
    },
  })

  const selectedEmployees = (
    staleOnly
      ? activeEmployees.filter((employee) =>
          shouldSyncEmployeeLearning({
            wp_user_id: employee.wp_user_id,
            courses: employee.courses,
          }),
        )
      : activeEmployees
  )
    .filter((employee) => (options?.companyId ? employee.company_id === options.companyId : true))
    .slice(0, limit)

  const results: Array<{
    employeeId: string
    status: "synced" | "failed" | "skipped"
    message?: string
  }> = []

  for (const employee of selectedEmployees) {
    const lockUntil = await claimEmployeeSyncLock(employee.id)
    if (!lockUntil) {
      results.push({
        employeeId: employee.id,
        status: "skipped",
        message: "Sincronización en curso",
      })
      continue
    }

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
    } finally {
      await releaseEmployeeSyncLock(employee.id, lockUntil)
    }
  }

  return {
    scanned: activeEmployees.length,
    queued: selectedEmployees.length,
    results,
  }
}

export function scheduleStaleEmployeeLearningBatch(options?: { limit?: number }) {
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
  companyId: string,
  options?: {
    limit?: number
    staleOnly?: boolean
  },
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

function scheduleEmployeeLearningBatch(options: { key: string; runner: () => Promise<unknown> }) {
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
  bridgeCourses: BridgeStudentCourse[],
) {
  if (bridgeCourses.length === 0) {
    return employee
  }

  const syncedAt = new Date()
  const bridgeCourseById = new Map(bridgeCourses.map((course) => [course.wp_course_id, course]))
  const mergedCourses = employee.courses
    .map((course) => {
      const bridgeCourse = bridgeCourseById.get(course.wp_course_id)
      if (!bridgeCourse) {
        return course
      }

      return {
        ...course,
        course_name: decodeHtmlEntities(bridgeCourse.title || course.course_name),
        progress_pct: bridgeCourse.progress_pct,
        completed: bridgeCourse.completed,
        course_start_date: parseBridgeDate(bridgeCourse.started_at) ?? course.course_start_date,
        completed_at: bridgeCourse.completed ? parseBridgeDate(bridgeCourse.completed_at) : null,
        last_synced_at: syncedAt,
      }
    })
    .sort((left, right) => {
      if (left.completed !== right.completed) {
        return left.completed ? 1 : -1
      }

      if (left.progress_pct !== right.progress_pct) {
        return right.progress_pct - left.progress_pct
      }

      return left.course_name.localeCompare(right.course_name, "es-MX")
    })

  return {
    ...employee,
    courses: mergedCourses,
  }
}

export async function getEmployeeLearningData(
  email: string,
  options?: {
    forceSync?: boolean
  },
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
    backgroundSyncQueued = await scheduleEmployeeLearningSync(employee.id)
  }

  if (!employee) {
    return null
  }

  employee = mergeEmployeeCoursesWithBridgeData(employee, latestBridgeCourses)

  const completedCourseIds = new Set(
    employee.certificates.map((certificate) => certificate.wp_course_id),
  )
  const pendingCertificates = employee.courses.filter(
    (course) => course.completed && !completedCourseIds.has(course.wp_course_id),
  )

  return {
    employee,
    pendingCertificates,
    syncedFromBridge,
    backgroundSyncQueued,
    syncError,
  }
}
