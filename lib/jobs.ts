import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { mapWithConcurrency } from "@/lib/concurrency"
import {
  syncSingleEmployeePackageEnrollment,
  type PackageEnrollmentSyncResult,
} from "@/lib/course-sync"
import { bridgeUpsertEmployee } from "@/lib/wordpress-bridge"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { sendEmail } from "@/lib/ses"

const JOB_CHUNK_SIZE = 20
const JOB_CONCURRENCY = 5
const JOBS_PER_CRON_TICK = 25

function getJobPayloadCipherKey() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET/NEXTAUTH_SECRET no está configurado")
  }
  return Buffer.from(hkdfSync("sha256", secret, "", "job-payload-cipher", 32))
}

function encryptJobPayloadSecret(plaintext: string) {
  const key = getJobPayloadCipherKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")
}

function decryptJobPayloadSecret(encoded: string) {
  const key = getJobPayloadCipherKey()
  const raw = Buffer.from(encoded, "base64")
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const ciphertext = raw.subarray(28)
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

type CsvBridgeSyncEmployee = {
  employeeId: string
  email: string
  firstName: string
  lastName: string
  department: string | null
  position: string | null
}

type CsvEmployeeBridgeSyncPayload = {
  companyId: string
  companyName: string
  pending: CsvBridgeSyncEmployee[]
  syncedCount: number
  warningCount: number
}

const EMAIL_SEND_MAX_ATTEMPTS = 5

type EmailSendPayload = {
  to: string
  subject: string
  html: string
  text: string
  attempts: number
}

type EmailSendInput = { to: string; subject: string; html: string; text: string }

export async function enqueueEmailSendJob(input: EmailSendInput) {
  const job = await prisma.job.create({
    data: {
      type: "EMAIL_SEND",
      payload: {
        to: input.to,
        subject: input.subject,
        html: encryptJobPayloadSecret(input.html),
        text: encryptJobPayloadSecret(input.text),
        attempts: 0,
      },
    },
  })

  return job.id
}

export async function enqueueEmailSendJobs(inputs: EmailSendInput[]) {
  if (inputs.length === 0) return

  await prisma.job.createMany({
    data: inputs.map((input) => ({
      type: "EMAIL_SEND",
      payload: {
        to: input.to,
        subject: input.subject,
        html: encryptJobPayloadSecret(input.html),
        text: encryptJobPayloadSecret(input.text),
        attempts: 0,
      },
    })),
  })
}

const EMAIL_SEND_BACKOFF_BASE_MS = 60_000
const EMAIL_SEND_BACKOFF_MAX_MS = 30 * 60_000

async function processEmailSendJob(jobId: string, payload: EmailSendPayload) {
  try {
    await sendEmail({
      to: payload.to,
      subject: payload.subject,
      html: decryptJobPayloadSecret(payload.html),
      text: decryptJobPayloadSecret(payload.text),
    })
    await prisma.job.update({
      where: { id: jobId },
      data: {
        payload: {
          to: payload.to,
          subject: payload.subject,
          html: "",
          text: "",
          attempts: payload.attempts,
        },
        status: "DONE",
        completed_at: new Date(),
        result: { to: payload.to },
      },
    })
  } catch (error) {
    const attempts = payload.attempts + 1
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "Error desconocido enviando el correo."
    const exhausted = attempts >= EMAIL_SEND_MAX_ATTEMPTS
    const backoffMs = Math.min(
      EMAIL_SEND_BACKOFF_BASE_MS * 2 ** (attempts - 1),
      EMAIL_SEND_BACKOFF_MAX_MS,
    )

    if (exhausted) {
      console.error("EMAIL_SEND: agotados los reintentos, correo no enviado", {
        to: payload.to,
        attempts,
        message,
      })
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        payload: { ...payload, attempts },
        status: exhausted ? "ERROR" : "PENDING",
        error: message,
        completed_at: exhausted ? new Date() : null,
        next_attempt_at: exhausted ? null : new Date(Date.now() + backoffMs),
      },
    })
  }
}

export async function enqueueCsvEmployeeBridgeSyncJob(input: {
  companyId: string
  companyName: string
  employees: CsvBridgeSyncEmployee[]
}) {
  if (input.employees.length === 0) return null

  const job = await prisma.job.create({
    data: {
      type: "CSV_EMPLOYEE_BRIDGE_SYNC",
      payload: {
        companyId: input.companyId,
        companyName: input.companyName,
        pending: input.employees,
        syncedCount: 0,
        warningCount: 0,
      },
    },
  })

  return job.id
}

async function processCsvEmployeeBridgeSyncJob(
  jobId: string,
  payload: CsvEmployeeBridgeSyncPayload,
) {
  const chunk = payload.pending.slice(0, JOB_CHUNK_SIZE)
  const remaining = payload.pending.slice(JOB_CHUNK_SIZE)

  const results = await mapWithConcurrency(chunk, JOB_CONCURRENCY, async (employee) => {
    try {
      const bridgeEmployee = await bridgeUpsertEmployee({
        employeeId: employee.employeeId,
        companyId: payload.companyId,
        companyName: payload.companyName,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
        position: employee.position,
      })
      return {
        employeeId: employee.employeeId,
        email: employee.email,
        wpUserId: bridgeEmployee.wp_user_id as number | null,
        ok: true as const,
      }
    } catch (error) {
      console.error("CSV_EMPLOYEE_BRIDGE_SYNC: fallo al sincronizar empleado con WordPress", {
        employeeId: employee.employeeId,
        email: employee.email,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        employeeId: employee.employeeId,
        email: employee.email,
        wpUserId: null,
        ok: false as const,
      }
    }
  })

  const synced = results.filter((result) => result.ok)
  if (synced.length > 0) {
    await prisma.$transaction(
      synced.flatMap((result) => [
        prisma.employee.updateMany({
          where: { id: result.employeeId },
          data: { wp_user_id: result.wpUserId },
        }),
        prisma.user.updateMany({
          where: { email: result.email, company_id: payload.companyId },
          data: { wp_user_id: result.wpUserId },
        }),
      ]),
    )
  }

  const syncedCount = payload.syncedCount + synced.length
  const warningCount = payload.warningCount + (results.length - synced.length)
  const isDone = remaining.length === 0

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        payload: {
          companyId: payload.companyId,
          companyName: payload.companyName,
          pending: remaining,
          syncedCount,
          warningCount,
        },
        status: isDone ? "DONE" : "PENDING",
        completed_at: isDone ? new Date() : null,
        result: isDone ? { synced: syncedCount, warnings: warningCount } : undefined,
      },
    })
  } catch (error) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        payload: {
          companyId: payload.companyId,
          companyName: payload.companyName,
          pending: [],
          syncedCount,
          warningCount,
        },
        status: "ERROR",
        completed_at: new Date(),
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Error desconocido guardando el progreso del job.",
      },
    })
    throw error
  }

  if (isDone) {
    await createAuditEvent({
      actor: getAuditActorFromSession(null),
      accion: "EMPLEADOS_CSV_SINCRONIZACION_WP_COMPLETADA",
      entityType: "EMPRESA",
      entityId: payload.companyId,
      companyId: payload.companyId,
      resumen: `Sincronización de empleados importados por CSV con WordPress completada para ${payload.companyName}.`,
      metadata: { sincronizados: syncedCount, advertencias: warningCount },
    })
  }
}

type PackageEnrollmentSyncPayload = {
  companyId: string
  employeeIds: string[]
  processedEmployeeIds: string[]
}

async function processPackageEnrollmentSyncJob(
  jobId: string,
  payload: PackageEnrollmentSyncPayload,
) {
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
        activePackage.package.delivery_mode,
      ),
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
    where: {
      status: "PENDING",
      OR: [{ next_attempt_at: null }, { next_attempt_at: { lte: new Date() } }],
    },
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
      } else if (job.type === "CSV_EMPLOYEE_BRIDGE_SYNC") {
        await processCsvEmployeeBridgeSyncJob(job.id, job.payload as CsvEmployeeBridgeSyncPayload)
      } else if (job.type === "EMAIL_SEND") {
        await processEmailSendJob(job.id, job.payload as EmailSendPayload)
      } else {
        throw new Error(`Tipo de job desconocido: ${job.type}`)
      }
      processed += 1
    } catch (error) {
      errored += 1
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Error desconocido procesando el job."

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "ERROR", error: message, completed_at: new Date() },
      })
    }
  }

  return { processed, errored, skipped, total: candidates.length }
}
