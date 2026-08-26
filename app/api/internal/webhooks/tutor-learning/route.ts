import { createHmac, timingSafeEqual } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { companyCacheRootTag } from "@/lib/cache-tags"
import { getCompanyBranding } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import {
  syncEmployeeLearningFromBridgeSnapshot,
  type EmployeeLearningBridgeSnapshot,
} from "@/lib/employee-learning"
import {
  isDuplicateTutorLearningWebhook,
  recordTutorLearningWebhookEvent,
  recordTutorLearningWebhookFailure,
  recordTutorLearningWebhookProcessed,
} from "@/lib/webhook-monitor"
import { isUuid } from "@/lib/uuid"

export const maxDuration = 60

type TutorLearningWebhookEvent = {
  student_wp_user_id?: number
  employee_id?: string | null
  company_id?: string | null
  source_hash?: string | null
  courses?: EmployeeLearningBridgeSnapshot["courses"]
  certificates?: EmployeeLearningBridgeSnapshot["certificates"]
}

type TutorLearningWebhookPayload = TutorLearningWebhookEvent & {
  event_type?: string
  occurred_at?: string
  events?: TutorLearningWebhookEvent[]
}

function getWebhookSecret() {
  return (
    process.env.BRIDGE_WEBHOOK_SECRET?.trim() || process.env.WP_BRIDGE_WEBHOOK_SECRET?.trim() || ""
  )
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function hasValidSignature(rawBody: string, timestamp: string, signature: string) {
  const secret = getWebhookSecret()
  if (!secret || !timestamp || !signature) {
    return false
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")

  return secureCompare(expected, signature)
}

function isFreshTimestamp(timestamp: string) {
  const parsedTimestamp = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(parsedTimestamp)) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - parsedTimestamp) <= 60 * 10
}

function isValidEvent(event: TutorLearningWebhookEvent) {
  return Number.isInteger(event.student_wp_user_id) && Array.isArray(event.courses)
}

async function processLearningWebhookEvent(
  event: TutorLearningWebhookEvent,
  eventType: string,
  occurredAt: string | null,
) {
  if (event.employee_id && !isUuid(event.employee_id)) {
    event.employee_id = null
  }
  if (event.company_id && !isUuid(event.company_id)) {
    event.company_id = null
  }

  if (!isValidEvent(event)) {
    await recordTutorLearningWebhookFailure({
      event_type: eventType,
      occurred_at: occurredAt,
      received_at: new Date().toISOString(),
      employee_id: event.employee_id ?? null,
      company_id: event.company_id ?? null,
      student_wp_user_id: event.student_wp_user_id ?? null,
      code: "invalid_event",
      error_message: "El payload del webhook viene incompleto.",
    })

    return {
      student_wp_user_id: event.student_wp_user_id ?? null,
      ok: false as const,
      code: "invalid_event" as const,
      message: "El payload del webhook viene incompleto.",
    }
  }

  const wpUserId = event.student_wp_user_id as number
  const sourceHash = event.source_hash ?? null

  if (await isDuplicateTutorLearningWebhook(wpUserId, sourceHash)) {
    return {
      student_wp_user_id: wpUserId,
      ok: true as const,
      duplicate: true,
      source_hash: sourceHash,
    }
  }

  try {
    const result = await syncEmployeeLearningFromBridgeSnapshot({
      employeeId: event.employee_id ?? null,
      wpUserId,
      snapshot: {
        courses: event.courses ?? [],
        certificates: event.certificates ?? [],
      },
    })

    await Promise.all([
      recordTutorLearningWebhookEvent({
        ok: true,
        event_type: eventType,
        occurred_at: occurredAt,
        received_at: new Date().toISOString(),
        employee_id: event.employee_id ?? null,
        company_id: event.company_id ?? null,
        student_wp_user_id: wpUserId,
        source_hash: sourceHash,
        courses_updated: result.coursesUpdated,
        certificates_updated: result.certificatesUpdated,
      }),
      recordTutorLearningWebhookProcessed(wpUserId, sourceHash),
    ])

    revalidatePath("/employee/courses")
    revalidatePath("/employee/certificates")

    if (event.company_id) {
      const branding = await getCompanyBranding(event.company_id)
      if (branding) {
        revalidatePath(companyPath(branding.slug, "/home"))
        revalidatePath(companyPath(branding.slug, "/progress"))
        revalidatePath(companyPath(branding.slug, "/certificates"))
      }
      revalidateTag(companyCacheRootTag(event.company_id), "max")
    }

    return { student_wp_user_id: wpUserId, ok: true as const, source_hash: sourceHash, ...result }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "No fue posible aplicar el webhook academico al portal."

    await recordTutorLearningWebhookFailure({
      event_type: eventType,
      occurred_at: occurredAt,
      received_at: new Date().toISOString(),
      employee_id: event.employee_id ?? null,
      company_id: event.company_id ?? null,
      student_wp_user_id: wpUserId,
      source_hash: sourceHash,
      code: "sync_failed",
      error_message: errorMessage,
    })

    return {
      student_wp_user_id: wpUserId,
      ok: false as const,
      code: "sync_failed" as const,
      message: errorMessage,
    }
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-d360-webhook-signature")?.trim() ?? ""
  const timestamp = request.headers.get("x-d360-webhook-timestamp")?.trim() ?? ""

  if (!getWebhookSecret()) {
    console.error("[tutor-learning-webhook] secret no configurado en el portal")
    return NextResponse.json(
      { ok: false, message: "Webhook secret no configurado en el portal." },
      { status: 503 },
    )
  }

  if (!isFreshTimestamp(timestamp) || !hasValidSignature(rawBody, timestamp, signature)) {
    console.error("[tutor-learning-webhook] firma invalida o expirada", { timestamp })
    return NextResponse.json(
      { ok: false, message: "Firma del webhook invalida o expirada." },
      { status: 401 },
    )
  }

  let payload: TutorLearningWebhookPayload

  try {
    payload = JSON.parse(rawBody) as TutorLearningWebhookPayload
  } catch {
    console.error("[tutor-learning-webhook] JSON invalido en el body")
    return NextResponse.json(
      { ok: false, message: "El webhook no contiene JSON valido." },
      { status: 400 },
    )
  }

  const eventType = payload.event_type ?? "student_learning_changed"
  const occurredAt = payload.occurred_at ?? null

  if (Array.isArray(payload.events)) {
    if (payload.events.length === 0) {
      return NextResponse.json(
        { ok: false, message: "El lote del webhook no contiene eventos." },
        { status: 400 },
      )
    }

    const results: Array<{
      student_wp_user_id: number | null
      ok: boolean
      [key: string]: unknown
    }> = []
    for (const event of payload.events) {
      try {
        results.push(await processLearningWebhookEvent(event, eventType, occurredAt))
      } catch (error) {
        results.push({
          student_wp_user_id: event?.student_wp_user_id ?? null,
          ok: false,
          code: "sync_failed",
          message:
            error instanceof Error ? error.message : "Error inesperado al procesar el evento.",
        })
      }
    }

    return NextResponse.json({ ok: true, event_type: eventType, occurred_at: occurredAt, results })
  }

  const result = await processLearningWebhookEvent(payload, eventType, occurredAt)
  if (!result.ok) {
    const status = result.code === "invalid_event" ? 400 : 500
    return NextResponse.json({ ok: false, message: result.message }, { status })
  }

  return NextResponse.json({ event_type: eventType, occurred_at: occurredAt, ...result })
}
