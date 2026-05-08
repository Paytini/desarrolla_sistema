import { prisma } from "@/lib/prisma"
import { bridgeHealthCheck, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

const TUTOR_WEBHOOK_STATUS_KEY = "tutor_learning_webhook"

type StoredWebhookStatusPayload = {
  event_type?: string | null
  occurred_at?: string | null
  received_at?: string | null
  employee_id?: number | null
  company_id?: number | null
  student_wp_user_id?: number | null
  source_hash?: string | null
  courses_updated?: number | null
  certificates_updated?: number | null
}

export async function recordTutorLearningWebhookEvent(
  payload: StoredWebhookStatusPayload
) {
  await prisma.integracionEstado.upsert({
    where: { clave: TUTOR_WEBHOOK_STATUS_KEY },
    update: {
      payload,
    },
    create: {
      clave: TUTOR_WEBHOOK_STATUS_KEY,
      payload,
    },
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
    prisma.integracionEstado.findUnique({
      where: { clave: TUTOR_WEBHOOK_STATUS_KEY },
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
          error_message: error instanceof Error ? error.message : "No fue posible consultar WordPress.",
        }))
      : Promise.resolve(null),
  ])

  const lastEvent = parseStoredPayload(storedStatus?.payload)

  return {
    bridgeConfigured: isWordPressBridgeConfigured(),
    webhookSecretConfigured: Boolean(
      process.env.BRIDGE_WEBHOOK_SECRET?.trim() || process.env.WP_BRIDGE_WEBHOOK_SECRET?.trim()
    ),
    syncIntervalMs: Number.parseInt(process.env.EMPLOYEE_SYNC_INTERVAL_MS ?? "60000", 10) || 60000,
    webhookUrlPath: "/api/internal/webhooks/tutor-learning",
    bridgeHealth,
    lastEvent,
    lastEventUpdatedAt: storedStatus?.updated_at ?? null,
  }
}
