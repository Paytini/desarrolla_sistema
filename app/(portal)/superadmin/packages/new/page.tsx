import { redirect } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { SubmitButton } from "@/components/superadmin/SubmitButton"
import PackageCourseSelector from "@/components/company/PackageCourseSelector"
import { getSession } from "@/lib/session"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { createPackageAction } from "../actions"

const errorMessages: Record<string, string> = {
  datos:  "Faltan datos obligatorios para crear el paquete.",
  cursos: "Debes seleccionar al menos un curso.",
  bundle: "No fue posible crear el bundle en Tutor LMS.",
}

const LABEL_SX = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "text.primary",
  mb: 0.75,
  display: "block",
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Typography sx={LABEL_SX}>{children}</Typography>
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NuevoPaquetePage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const error  = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <Box sx={{ mb: 5 }}>
        <Link
          href="/superadmin/packages"
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            6,
            fontSize:       13,
            color:          "#64748b",
            textDecoration: "none",
            marginBottom:   12,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Paquetes
        </Link>
        <Typography
          variant="h1"
          sx={{ fontSize: "22px", fontWeight: 600, mt: 1.5, lineHeight: 1.25 }}
        >
          Nuevo paquete
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "13px", color: "text.secondary" }}>
          Define un paquete con cursos de Tutor LMS y, opcionalmente, un bundle privado.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          icon={<AlertCircle size={16} />}
          sx={{ borderRadius: 2, mb: 3 }}
        >
          {detail
            ? `${errorMessages[error] ?? error} — ${detail}`
            : (errorMessages[error] ?? error)}
        </Alert>
      )}

      <Box
        component="form"
        action={createPackageAction}
        sx={{ display: "grid", gap: 2.5 }}
      >
        <Box>
          <FieldLabel>Nombre del paquete *</FieldLabel>
          <TextField
            name="nombre"
            required
            placeholder="Ej: Paquete Seguridad Industrial"
            size="small"
            fullWidth
          />
        </Box>

        <Box>
          <FieldLabel>Descripción</FieldLabel>
          <TextField
            name="descripcion"
            multiline
            rows={2}
            placeholder="Descripción del paquete…"
            size="small"
            fullWidth
          />
        </Box>

        <Box>
          <FieldLabel>Modo de entrega B2B</FieldLabel>
          <TextField
            name="modo_entrega"
            select
            defaultValue="DIRECT_ENROLLMENT"
            size="small"
            fullWidth
          >
            <MenuItem value="DIRECT_ENROLLMENT">
              Matrícula directa por curso (Recomendado)
            </MenuItem>
            <MenuItem value="PRIVATE_BUNDLE_REFERENCE">
              Bundle privado como referencia operativa
            </MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <FieldLabel>WP Bundle ID</FieldLabel>
            <TextField
              name="wp_bundle_id"
              type="number"
              placeholder="Opcional"
              slotProps={{ htmlInput: { min: 1 } }}
              size="small"
              fullWidth
            />
          </Box>
          <Box>
            <FieldLabel>Nombre del bundle</FieldLabel>
            <TextField
              name="nombre_bundle"
              placeholder="Auto si se crea desde el portal"
              size="small"
              fullWidth
            />
          </Box>
        </Box>

        <Box
          sx={{
            borderRadius: "8px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            px: 2,
            py: 1.5,
            fontSize: 12,
            lineHeight: 1.6,
            color: "text.secondary",
          }}
        >
          Si dejas vacío <strong>WP Bundle ID</strong>, el portal intentará crear un bundle
          privado en Tutor LMS.
        </Box>

        <Box>
          <FieldLabel>Notas operativas</FieldLabel>
          <TextField name="notas_operativas" multiline rows={2} size="small" fullWidth />
        </Box>

        <Box>
          <FieldLabel>Cursos del paquete *</FieldLabel>
          <PackageCourseSelector />
        </Box>

        <Divider />

        <SubmitButton fullWidth variant="contained">
          Guardar paquete
        </SubmitButton>
      </Box>
    </Box>
  )
}
