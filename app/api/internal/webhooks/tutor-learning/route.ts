import { createHmac, timingSafeEqual } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { SUPERADMIN_GLOBAL_TAG, empresaCacheRootTag } from "@/lib/cache-tags"
import {
  syncEmployeeLearningFromBridgeSnapshot,
  type EmployeeLearningBridgeSnapshot,
} from "@/lib/employee-learning"
import { recordTutorLearningWebhookEvent } from "@/lib/webhook-monitor"

type TutorLearningWebhookPayload = {
  event_type?: string
  occurred_at?: string
  student_wp_user_id?: number
  employee_id?: number | null
  company_id?: number | null
  source_hash?: string | null
  courses?: EmployeeLearningBridgeSnapshot["courses"]
  certificates?: EmployeeLearningBridgeSnapshot["certificates"]
}

function getWebhookSecret() {
  return process.env.BRIDGE_WEBHOOK_SECRET?.trim() || process.env.WP_BRIDGE_WEBHOOK_SECRET?.trim() || ""
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

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")

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

function isValidPayload(payload: TutorLearningWebhookPayload) {
  return Number.isInteger(payload.student_wp_user_id) && Array.isArray(payload.courses)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-d360-webhook-signature")?.trim() ?? ""
  const timestamp = request.headers.get("x-d360-webhook-timestamp")?.trim() ?? ""

  if (!getWebhookSecret()) {
    return NextResponse.json(
      { ok: false, message: "Webhook secret no configurado en el portal." },
      { status: 503 }
    )
  }

  if (!isFreshTimestamp(timestamp) || !hasValidSignature(rawBody, timestamp, signature)) {
    return NextResponse.json(
      { ok: false, message: "Firma del webhook invalida o expirada." },
      { status: 401 }
    )
  }

  let payload: TutorLearningWebhookPayload

  try {
    payload = JSON.parse(rawBody) as TutorLearningWebhookPayload
  } catch {
    return NextResponse.json(
      { ok: false, message: "El webhook no contiene JSON valido." },
      { status: 400 }
    )
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      { ok: false, message: "El payload del webhook viene incompleto." },
      { status: 400 }
    )
  }

  try {
    const result = await syncEmployeeLearningFromBridgeSnapshot({
      empleadoId: payload.employee_id ?? null,
      wpUserId: payload.student_wp_user_id,
      snapshot: {
        courses: payload.courses ?? [],
        certificates: payload.certificates ?? [],
      },
    })

    await recordTutorLearningWebhookEvent({
      event_type: payload.event_type ?? "student_learning_changed",
      occurred_at: payload.occurred_at ?? null,
      received_at: new Date().toISOString(),
      employee_id: payload.employee_id ?? null,
      company_id: payload.company_id ?? null,
      student_wp_user_id: payload.student_wp_user_id ?? null,
      source_hash: payload.source_hash ?? null,
      courses_updated: result.coursesUpdated,
      certificates_updated: result.certificatesUpdated,
    })

    revalidatePath("/empleado/cursos")
    revalidatePath("/empleado/progreso")
    revalidatePath("/empleado/constancias")

    if (payload.company_id) {
      revalidatePath("/empresa/inicio")
      revalidatePath("/empresa/progreso")
      revalidatePath("/empresa/constancias")
      revalidateTag(empresaCacheRootTag(payload.company_id), "max")
      revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
    }

    return NextResponse.json({
      ok: true,
      event_type: payload.event_type ?? "student_learning_changed",
      occurred_at: payload.occurred_at ?? null,
      source_hash: payload.source_hash ?? null,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible aplicar el webhook academico al portal.",
      },
      { status: 500 }
    )
  }
}
