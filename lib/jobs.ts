import { prisma } from "@/lib/prisma"
import { mapWithConcurrency } from "@/lib/concurrency"
import { syncSingleEmployeePackageEnrollment, type PackageEnrollmentSyncResult } from "@/lib/course-sync"

const JOB_CHUNK_SIZE = 20
const JOB_CONCURRENCY = 5
const JOBS_PER_CRON_TICK = 5

type PackageEnrollmentSyncPayload = {
  companyId: string
  employeeIds: string[]
  processedEmployeeIds: string[]
}

async function processPackageEnrollmentSyncJob(jobId: string, payload: PackageEnrollmentSyncPayload) {
  const processedIds = new Set(payload.processedEmployeeIds)
  const remainingIds = payload.employeeIds.filter((id) => !processedIds.has(id))

  if (remainingIds.length === 0) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        completed_at: new Date(),
        result: { employeeCount: payload.employeeIds.length },
      },
    })
    return
  }

  const company = await prisma.company.findUnique({
    where: { id: payload.companyId },
    include: {
      packages: {
        where: { active: true },
        orderBy: { created_at: "desc" },
        include: { package: { include: { courses: true } } },
        take: 1,
      },
    },
  })

  const activePackage = company?.packages[0]
  if (!company || !activePackage) {
    throw new Error("La empresa ya no tiene un paquete activo asignado")
  }

  const courseIds = activePackage.package.courses.map((course) => course.wp_course_id)
  const courseIdSet = new Set(courseIds)
  const packageCourses = activePackage.package.courses.map((course) => ({
    wp_course_id: course.wp_course_id,
    course_name: course.course_name,
    access_source: activePackage.package.delivery_mode,
  }))

  const chunkIds = remainingIds.slice(0, JOB_CHUNK_SIZE)
  const employees = await prisma.employee.findMany({
    where: { id: { in: chunkIds } },
    select: { id: true, wp_user_id: true },
  })

  const results: PackageEnrollmentSyncResult[] = await mapWithConcurrency(
    employees,
    JOB_CONCURRENCY,
    (employee) =>
      syncSingleEmployeePackageEnrollment(
        employee,
        packageCourses,
        courseIds,
        courseIdSet,
        activePackage.package.delivery_mode
      )
  )

  const newProcessedIds = [...processedIds, ...chunkIds]
  const isDone = newProcessedIds.length >= payload.employeeIds.length
  const erroredCount = results.filter((result) => result.error).length

  await prisma.job.update({
    where: { id: jobId },
    data: {
      payload: {
        companyId: payload.companyId,
        employeeIds: payload.employeeIds,
        processedEmployeeIds: newProcessedIds,
      },
      status: isDone ? "DONE" : "PENDING",
      completed_at: isDone ? new Date() : null,
      result: isDone
        ? { employeeCount: payload.employeeIds.length, erroredInLastChunk: erroredCount }
        : undefined,
    },
  })
}

const PROCESSING_STALE_MS = 10 * 60 * 1000

export async function processPendingJobs(limit: number = JOBS_PER_CRON_TICK) {
  const staleThreshold = new Date(Date.now() - PROCESSING_STALE_MS)

  await prisma.job.updateMany({
    where: { status: "PROCESSING", started_at: { lt: staleThreshold } },
    data: { status: "PENDING" },
  })

  const candidates = await prisma.job.findMany({
    where: { status: "PENDING" },
    orderBy: { created_at: "asc" },
    take: limit,
    select: { id: true },
  })

  let processed = 0
  let errored = 0
  let skipped = 0

  for (const candidate of candidates) {
    const claim = await prisma.job.updateMany({
      where: { id: candidate.id, status: "PENDING" },
      data: { status: "PROCESSING", started_at: new Date() },
    })

    if (claim.count === 0) {
      skipped += 1
      continue
    }

    const job = await prisma.job.findUniqueOrThrow({ where: { id: candidate.id } })

    try {
      if (job.type === "PACKAGE_ENROLLMENT_SYNC") {
        await processPackageEnrollmentSyncJob(job.id, job.payload as PackageEnrollmentSyncPayload)
      } else {
        throw new Error(`Tipo de job desconocido: ${job.type}`)
      }
      processed += 1
    } catch (error) {
      errored += 1
      const message =
        error instanceof Error ? error.message.slice(0, 500) : "Error desconocido procesando el job."

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "ERROR", error: message, completed_at: new Date() },
      })
    }
  }

  return { processed, errored, skipped, total: candidates.length }
}
