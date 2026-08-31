import { prisma } from "@/lib/prisma"
import { bridgeHealthCheck, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

const TUTOR_WEBHOOK_STATUS_KEY = "tutor_learning_webhook"
const HEARTBEAT_SAMPLE_INTERVAL_MS = 30_000

type StoredWebhookStatusPayload = {
  ok?: boolean | null
  event_type?: string | null
  occurred_at?: string | null
  received_at?: string | null
  employee_id?: string | null
  company_id?: string | null
  student_wp_user_id?: number | null
  source_hash?: string | null
  courses_updated?: number | null
  certificates_updated?: number | null
  code?: string | null
  error_message?: string | null
}

export async function recordTutorLearningWebhookEvent(payload: StoredWebhookStatusPayload) {
  const existing = await prisma.integrationState.findUnique({
    where: { key: TUTOR_WEBHOOK_STATUS_KEY },
    select: { updated_at: true },
  })

  const isStale =
    !existing || Date.now() - existing.updated_at.getTime() >= HEARTBEAT_SAMPLE_INTERVAL_MS
  if (!isStale) return

  await prisma.integrationState.upsert({
    where: { key: TUTOR_WEBHOOK_STATUS_KEY },
    update: {
      payload,
    },
    create: {
      key: TUTOR_WEBHOOK_STATUS_KEY,
      payload,
    },
  })
}

export async function recordTutorLearningWebhookFailure(payload: StoredWebhookStatusPayload) {
  const failurePayload = { ...payload, ok: false }

  console.error("[tutor-learning-webhook]", failurePayload)

  await prisma.integrationState.upsert({
    where: { key: TUTOR_WEBHOOK_STATUS_KEY },
    update: { payload: failurePayload },
    create: { key: TUTOR_WEBHOOK_STATUS_KEY, payload: failurePayload },
  })
}

function studentIdempotencyKey(wpUserId: number) {
  return `tutor_learning_webhook_student:${wpUserId}`
}

export async function isDuplicateTutorLearningWebhook(wpUserId: number, sourceHash: string | null) {
  if (!sourceHash) return false

  const existing = await prisma.integrationState.findUnique({
    where: { key: studentIdempotencyKey(wpUserId) },
    select: { payload: true },
  })

  const existingHash =
    (existing?.payload as { source_hash?: string | null } | null)?.source_hash ?? null
  return existingHash === sourceHash
}

export async function recordTutorLearningWebhookProcessed(
  wpUserId: number,
  sourceHash: string | null,
) {
  if (!sourceHash) return

  const key = studentIdempotencyKey(wpUserId)
  await prisma.integrationState.upsert({
    where: { key },
    update: { payload: { source_hash: sourceHash } },
    create: { key, payload: { source_hash: sourceHash } },
  })
}

function parseStoredPayload(payload: unknown): StoredWebhookStatusPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

  return payload as StoredWebhookStatusPayload
}

export async function getTutorLearningWebhookDiagnostics() {
  const [storedStatus, bridgeHealth] = await Promise.all([
    prisma.integrationState.findUnique({
      where: { key: TUTOR_WEBHOOK_STATUS_KEY },
    }),
    isWordPressBridgeConfigured()
      ? bridgeHealthCheck().catch((error) => ({
          ok: false,
          plugin_version: "",
          site_url: "",
          wordpress_version: "",
          tutor_rest_available: false,
          service_user_configured: false,
          learning_webhook_configured: false,
          error_message:
            error instanceof Error ? error.message : "No fue posible consultar WordPress.",
        }))
      : Promise.resolve(null),
  ])

  const lastEvent = parseStoredPayload(storedStatus?.payload)

  return {
    bridgeConfigured: isWordPressBridgeConfigured(),
    webhookSecretConfigured: Boolean(
      process.env.BRIDGE_WEBHOOK_SECRET?.trim() || process.env.WP_BRIDGE_WEBHOOK_SECRET?.trim(),
    ),
    syncIntervalMs: Number.parseInt(process.env.EMPLOYEE_SYNC_INTERVAL_MS ?? "15000", 10) || 15000,
    webhookUrlPath: "/api/internal/webhooks/tutor-learning",
    bridgeHealth,
    lastEvent,
    lastEventUpdatedAt: storedStatus?.updated_at ?? null,
  }
}
