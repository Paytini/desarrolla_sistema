import { NextResponse } from "next/server"
import { hasValidCronSecret } from "@/lib/cron-auth"
import { getTutorLearningWebhookDiagnostics } from "@/lib/webhook-monitor"
import { notifySuperadmins } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

const STALE_WEBHOOK_THRESHOLD_MS = 26 * 60 * 60 * 1000
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000
const ALERT_STATE_KEY = "bridge_health_alert"

type AlertStatePayload = {
  last_alert_at?: string
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 })
  }

  const diagnostics = await getTutorLearningWebhookDiagnostics()

  if (!diagnostics.bridgeConfigured) {
    return NextResponse.json({ ok: true, skipped: "bridge_not_configured" })
  }

  const problems: string[] = []

  if (diagnostics.bridgeHealth && !diagnostics.bridgeHealth.ok) {
    problems.push(
      `El bridge de WordPress no respondio correctamente: ${diagnostics.bridgeHealth.error_message || "sin detalle"}.`,
    )
  }

  if (diagnostics.lastEventUpdatedAt) {
    const staleMs = Date.now() - new Date(diagnostics.lastEventUpdatedAt).getTime()
    if (staleMs > STALE_WEBHOOK_THRESHOLD_MS) {
      const hours = Math.floor(staleMs / (60 * 60 * 1000))
      problems.push(`El webhook de aprendizaje no recibe eventos desde hace ${hours} horas.`)
    }
  }

  if (problems.length === 0) {
    return NextResponse.json({ ok: true, healthy: true })
  }

  const alertState = await prisma.integrationState.findUnique({ where: { key: ALERT_STATE_KEY } })
  const lastAlertAt = (alertState?.payload as AlertStatePayload | null)?.last_alert_at

  if (lastAlertAt && Date.now() - new Date(lastAlertAt).getTime() < ALERT_COOLDOWN_MS) {
    return NextResponse.json({ ok: true, healthy: false, alert_skipped: "cooldown" })
  }

  await notifySuperadmins({
    tipo: "BRIDGE_WORDPRESS_ALERTA",
    titulo: "Problema con el bridge de WordPress",
    mensaje: problems.join(" "),
  })

  await prisma.integrationState.upsert({
    where: { key: ALERT_STATE_KEY },
    update: { payload: { last_alert_at: new Date().toISOString() } },
    create: { key: ALERT_STATE_KEY, payload: { last_alert_at: new Date().toISOString() } },
  })

  return NextResponse.json({ ok: true, healthy: false, problems })
}
