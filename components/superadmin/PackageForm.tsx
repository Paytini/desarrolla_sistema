import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

import { SubmitButton } from "@/components/superadmin/SubmitButton"
import PackageCourseSelector from "@/components/company/PackageCourseSelector"

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

export type PackageFormInitialValues = {
  id: number
  name: string
  description: string
  deliveryMode: string
  wpBundleId: number | null
  bundleName: string
  operationalNotes: string
  courses: { wp_course_id: number; title: string; thumbnail_url?: string | null }[]
}

type PackageFormProps = {
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  initialValues?: PackageFormInitialValues
}

export function PackageForm({ action, submitLabel, initialValues }: PackageFormProps) {
  const hasExistingBundle = Boolean(initialValues?.wpBundleId)

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2.5 }}>
      {initialValues && <input type="hidden" name="package_id" value={initialValues.id} />}

      <Box>
        <FieldLabel>Nombre del paquete *</FieldLabel>
        <TextField
          name="nombre"
          required
          placeholder="Ej: Paquete Seguridad Industrial"
          size="small"
          fullWidth
          defaultValue={initialValues?.name}
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
          defaultValue={initialValues?.description}
        />
      </Box>

      <Box>
        <FieldLabel>Modo de entrega B2B</FieldLabel>
        <TextField
          name="modo_entrega"
          select
          defaultValue={initialValues?.deliveryMode ?? "DIRECT_ENROLLMENT"}
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
          {hasExistingBundle ? (
            <>
              <input type="hidden" name="wp_bundle_id" value={initialValues!.wpBundleId!} />
              <TextField
                value={initialValues!.wpBundleId}
                size="small"
                fullWidth
                disabled
                helperText="Ya vinculado — se sincroniza automáticamente al guardar."
              />
            </>
          ) : (
            <TextField
              name="wp_bundle_id"
              type="number"
              placeholder="Opcional"
              slotProps={{ htmlInput: { min: 1 } }}
              size="small"
              fullWidth
            />
          )}
        </Box>
        <Box>
          <FieldLabel>Nombre del bundle</FieldLabel>
          <TextField
            name="nombre_bundle"
            placeholder="Auto si se crea desde el portal"
            size="small"
            fullWidth
            defaultValue={initialValues?.bundleName}
            disabled={hasExistingBundle}
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
        {hasExistingBundle ? (
          <>
            Este paquete ya tiene un bundle en WordPress. Al guardar, el título, la descripción
            y los cursos seleccionados se sincronizan automáticamente con ese bundle.
          </>
        ) : (
          <>
            Si dejas vacío <strong>WP Bundle ID</strong>, el portal intentará crear un bundle
            privado en Tutor LMS.
          </>
        )}
      </Box>

      <Box>
        <FieldLabel>Notas operativas</FieldLabel>
        <TextField
          name="notas_operativas"
          multiline
          rows={2}
          size="small"
          fullWidth
          defaultValue={initialValues?.operationalNotes}
        />
      </Box>

      <Box>
        <FieldLabel>Cursos del paquete *</FieldLabel>
        <PackageCourseSelector initialCourses={initialValues?.courses} />
      </Box>

      <Divider />

      <SubmitButton fullWidth variant="contained">
        {submitLabel}
      </SubmitButton>
    </Box>
  )
}
