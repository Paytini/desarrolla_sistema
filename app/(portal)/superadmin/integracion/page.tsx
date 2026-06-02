import { redirect } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getSession } from "@/lib/session"
import { getTutorLearningWebhookDiagnostics } from "@/lib/webhook-monitor"
import { CheckCircle2, Plug, XCircle } from "lucide-react"

function buildPortalWebhookUrl() {
  const baseUrl = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "")
  return baseUrl ? `${baseUrl}/api/internal/webhooks/tutor-learning` : "/api/internal/webhooks/tutor-learning"
}

function bool(value: boolean) { return value ? "Sí" : "No" }

export default async function SuperAdminIntegracionPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const diagnostics = await getTutorLearningWebhookDiagnostics()
  const bridgeHealth = diagnostics.bridgeHealth
  const bridgeReachable = bridgeHealth ? bridgeHealth.ok : false
  const bridgeError = bridgeHealth && "error_message" in bridgeHealth ? bridgeHealth.error_message : null

  const infoRows = [
    {
      label: "Plugin",
      items: [
        { key: "Versión", value: bridgeHealth?.plugin_version || "Sin dato" },
        { key: "WordPress", value: bridgeHealth?.wordpress_version || "Sin dato" },
        { key: "Tutor REST disponible", value: bool(Boolean(bridgeHealth?.tutor_rest_available)) },
      ],
    },
    {
      label: "Configuración",
      items: [
        { key: "Service user", value: bool(Boolean(bridgeHealth?.service_user_configured)) },
        { key: "Webhook en bridge", value: bool(Boolean(bridgeHealth?.learning_webhook_configured)) },
        { key: "URL esperada", value: buildPortalWebhookUrl(), mono: true },
      ],
    },
  ]

  const statusCards = [
    { label: "Bridge configurado", ok: diagnostics.bridgeConfigured, description: "Base URL y credenciales definidas en variables de entorno." },
    { label: "Bridge responde", ok: bridgeReachable, description: "Health check responde desde el portal correctamente." },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SuperAdmin</p>
        <h1 className="text-2xl font-bold text-slate-950">Integración WordPress / Tutor</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Diagnóstico del bridge, webhook académico y último evento recibido.
        </p>
      </div>

      {/* Status banner */}
      {bridgeReachable ? (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Bridge conectado correctamente</AlertTitle>
          <AlertDescription>desarrolla360-bridge · WordPress · Tutor LMS Pro</AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>Bridge inaccesible</AlertTitle>
          <AlertDescription>
            {bridgeError ?? "No se pudo establecer conexión con el plugin WordPress."}
          </AlertDescription>
        </Alert>
      )}

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {statusCards.map(({ label, ok, description }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{ok ? "Sí" : "No"}</p>
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${ok ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}>
                  {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bridge detail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plug size={16} className="text-[#F5853F]" />
            <CardTitle className="text-[15px]">Estado del bridge</CardTitle>
          </div>
          <CardDescription>
            Detalles de la conexión con WordPress, Tutor LMS y la configuración del webhook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {infoRows.map(({ label, items }) => (
              <div key={label} className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  {items.map(({ key, value, mono }) => (
                    <div key={key} className="flex justify-between gap-4">
                      <span className="text-sm text-slate-500 shrink-0">{key}</span>
                      <span className={`text-sm font-medium text-slate-950 text-right break-all ${mono ? "font-mono text-xs" : ""}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {bridgeError && (
            <>
              <Separator className="my-4" />
              <Alert variant="destructive">
                <XCircle className="size-4" />
                <AlertDescription>
                  No pudimos consultar el health del bridge. Detalle: {bridgeError}
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
