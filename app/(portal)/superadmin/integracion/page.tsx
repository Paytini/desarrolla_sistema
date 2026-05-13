import { redirect } from "next/navigation"

import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import { formatDateTime } from "@/lib/format"
import { getSession } from "@/lib/session"
import { getTutorLearningWebhookDiagnostics } from "@/lib/webhook-monitor"

function buildPortalWebhookUrl() {
  const baseUrl = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "")
  if (!baseUrl) {
    return "/api/internal/webhooks/tutor-learning"
  }

  return `${baseUrl}/api/internal/webhooks/tutor-learning`
}

function formatBooleanStatus(value: boolean) {
  return value ? "Sí" : "No"
}

function formatMinutes(milliseconds: number) {
  return `${Math.max(1, Math.round(milliseconds / 60_000))} min`
}

export default async function SuperAdminIntegracionPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const diagnostics = await getTutorLearningWebhookDiagnostics()
  const bridgeHealth = diagnostics.bridgeHealth
  const bridgeReachable = bridgeHealth ? bridgeHealth.ok : false
  const bridgeError =
    bridgeHealth && "error_message" in bridgeHealth ? bridgeHealth.error_message : null
  const lastEvent = diagnostics.lastEvent

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Integración WordPress / Tutor"
        description="Diagnóstico rápido del bridge, del webhook académico y del último evento recibido por el portal."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Bridge configurado"
          value={formatBooleanStatus(diagnostics.bridgeConfigured)}
          description="Confirma que el portal tiene base URL y credenciales para hablar con WordPress."
          accent={diagnostics.bridgeConfigured ? "teal" : "violet"}
        />
        <InfoCard
          title="Bridge responde"
          value={formatBooleanStatus(bridgeReachable)}
          description="Valida si el health check del bridge responde correctamente desde el portal."
          accent={bridgeReachable ? "teal" : "violet"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Estado del bridge</h2>
            <p className="text-sm leading-6 text-slate-600">
              Verifica si WordPress está accesible y si el bridge ya quedó listo para empujar cambios.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plugin</p>
              <p className="mt-2 text-sm text-slate-700">
                Versión: <span className="font-semibold text-slate-950">{bridgeHealth?.plugin_version || "Sin dato"}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                WordPress: <span className="font-semibold text-slate-950">{bridgeHealth?.wordpress_version || "Sin dato"}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Tutor REST: <span className="font-semibold text-slate-950">{formatBooleanStatus(Boolean(bridgeHealth?.tutor_rest_available))}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Configuración</p>
              <p className="mt-2 text-sm text-slate-700">
                Service user: <span className="font-semibold text-slate-950">{formatBooleanStatus(Boolean(bridgeHealth?.service_user_configured))}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Webhook en bridge: <span className="font-semibold text-slate-950">{formatBooleanStatus(Boolean(bridgeHealth?.learning_webhook_configured))}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700 break-all">
                URL esperada: <span className="font-semibold text-slate-950">{buildPortalWebhookUrl()}</span>
              </p>
            </div>
          </div>

          {bridgeError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              No pudimos consultar el health del bridge. Detalle: {bridgeError}
            </div>
          ) : null}
        </article>
      </section>
    </div>
  )
}
