import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTutorLearningWebhookDiagnostics } from "@/lib/webhook-monitor"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { CheckCircle2, Plug, XCircle } from "lucide-react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"

function buildPortalWebhookUrl() {
  const baseUrl = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "")
  return baseUrl ? `${baseUrl}/api/internal/webhooks/tutor-learning` : "/api/internal/webhooks/tutor-learning"
}

function bool(value: boolean) { return value ? "Sí" : "No" }

export default async function SuperAdminIntegracionPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const diagnostics   = await getTutorLearningWebhookDiagnostics()
  const bridgeHealth  = diagnostics.bridgeHealth
  const bridgeReachable = bridgeHealth ? bridgeHealth.ok : false
  const bridgeError   = bridgeHealth && "error_message" in bridgeHealth ? bridgeHealth.error_message : null

  const infoRows = [
    {
      label: "Plugin",
      items: [
        { key: "Versión",                value: bridgeHealth?.plugin_version    || "Sin dato" },
        { key: "WordPress",              value: bridgeHealth?.wordpress_version  || "Sin dato" },
        { key: "Tutor REST disponible",  value: bool(Boolean(bridgeHealth?.tutor_rest_available)) },
      ],
    },
    {
      label: "Configuración",
      items: [
        { key: "Service user",        value: bool(Boolean(bridgeHealth?.service_user_configured)) },
        { key: "Webhook en bridge",   value: bool(Boolean(bridgeHealth?.learning_webhook_configured)) },
        { key: "URL esperada",        value: buildPortalWebhookUrl(), mono: true },
      ],
    },
  ]

  const statusCards = [
    { label: "Bridge configurado", ok: diagnostics.bridgeConfigured, description: "Base URL y credenciales definidas en variables de entorno." },
    { label: "Bridge responde",    ok: bridgeReachable,              description: "Health check responde desde el portal correctamente." },
  ]

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        breadcrumb="SuperAdmin · Sistema"
        title="Integración WordPress / Tutor"
        description="Diagnóstico del bridge, webhook académico y último evento recibido."
        accentColor="#8B5CF6"
      />

      {/* Status banner */}
      {bridgeReachable ? (
        <Alert
          severity="success"
          icon={<CheckCircle2 size={16} />}
          sx={{ borderRadius: 2, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", color: "#14532d" }}
        >
          <strong>Bridge conectado correctamente</strong>
          <br />
          desarrolla360-bridge · WordPress · Tutor LMS Pro
        </Alert>
      ) : (
        <Alert
          severity="error"
          icon={<XCircle size={16} />}
          sx={{ borderRadius: 2 }}
        >
          <strong>Bridge inaccesible</strong>
          <br />
          {bridgeError ?? "No se pudo establecer conexión con el plugin WordPress."}
        </Alert>
      )}

      {/* Status cards */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        {statusCards.map(({ label, ok, description }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}
          >
            <Box sx={{ p: 2.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{label}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 700, color: "text.primary" }}>
                  {ok ? "Sí" : "No"}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>{description}</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  flexShrink: 0,
                  bgcolor: ok ? "#f0fdf4" : "#fef2f2",
                  color: ok ? "#16a34a" : "#ef4444",
                }}
              >
                {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Bridge detail */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        {/* Card header */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Plug size={16} style={{ color: "#F5853F" }} />
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: "text.primary" }}>
              Estado del bridge
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
            Detalles de la conexión con WordPress, Tutor LMS y la configuración del webhook.
          </Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            {infoRows.map(({ label, items }) => (
              <Box key={label}>
                <Typography
                  sx={{
                    mb: 1.5,
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "text.disabled",
                  }}
                >
                  {label}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                    p: 2,
                  }}
                >
                  {items.map(({ key, value, mono }) => (
                    <Box key={key} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                      <Typography sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }}>
                        {key}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: mono ? 11 : 13,
                          fontWeight: 500,
                          color: "text.primary",
                          textAlign: "right",
                          wordBreak: "break-all",
                          fontFamily: mono ? "monospace" : undefined,
                        }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          {bridgeError && (
            <>
              <Divider sx={{ my: 2 }} />
              <Alert
                severity="error"
                icon={<XCircle size={16} />}
                sx={{ borderRadius: 2 }}
              >
                No pudimos consultar el health del bridge. Detalle: {bridgeError}
              </Alert>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
