"use client"

import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RotateCw, Upload, X } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { formatDate } from "@/lib/format"

type CourseMetadata = {
  id: number
  nombre_curso: string | null
  duracion_horas: number | null
  area_tematica_nombre: string | null
  area_tematica_clave: string | null
  agente_capacitador_nombre: string | null
  agente_capacitador_registro: string | null
  instructor_nombre: string | null
  instructor_firma_url: string | null
  fuente: string
  ultima_sincronizacion: Date | null
}

export type CourseEntry = {
  wp_curso_id: number
  nombre_curso: string
  paquetes: string[]
  metadata: CourseMetadata | null
}

type SaveAction = (formData: FormData) => Promise<{ ok: boolean; error?: string }>
type SyncAction = (formData: FormData) => Promise<{ ok: boolean; error?: string }>

type Status = "complete" | "incomplete" | "empty"

function getStatus(m: CourseMetadata | null): Status {
  if (!m) return "empty"
  const ok =
    m.duracion_horas != null &&
    !!m.area_tematica_nombre &&
    !!m.agente_capacitador_nombre &&
    !!m.instructor_nombre &&
    !!m.instructor_firma_url
  return ok ? "complete" : "incomplete"
}

function getCompleteness(m: CourseMetadata | null): number {
  if (!m) return 0
  return [
    m.duracion_horas != null,
    !!m.area_tematica_nombre,
    !!m.agente_capacitador_nombre,
    !!m.instructor_nombre,
    !!m.instructor_firma_url,
  ].filter(Boolean).length
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; color: string; border: string; dot: string }
> = {
  complete:   { label: "Completo",   bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e"  },
  incomplete: { label: "Incompleto", bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b"  },
  empty:      { label: "Sin datos",  bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", dot: "#94a3b8"  },
}

// ── Field label helper ───────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
        {label}
        {required && <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>*</Box>}
      </Typography>
      {children}
    </Box>
  )
}

// ── Course editor card ───────────────────────────────────────────────
function CourseEditorCard({
  course,
  action,
  syncAction,
  defaultOpen,
}: {
  course: CourseEntry
  action: SaveAction
  syncAction: SyncAction
  defaultOpen?: boolean
}) {
  const [open, setOpen]                 = useState(defaultOpen ?? false)
  const [isPending, startTransition]    = useTransition()
  const [saved, setSaved]               = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [firmaUrl, setFirmaUrl]         = useState(course.metadata?.instructor_firma_url ?? "")
  const [uploadingFirma, setUploadingFirma] = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const fileInputRef                    = useRef<HTMLInputElement>(null)
  const [isSyncing, startSyncTransition] = useTransition()
  const [syncSuccess, setSyncSuccess]   = useState(false)
  const [syncError, setSyncError]       = useState<string | null>(null)
  const router                          = useRouter()

  const status       = getStatus(course.metadata)
  const completeness = getCompleteness(course.metadata)
  const cfg          = STATUS_CONFIG[status]
  const m            = course.metadata

  async function handleFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFirma(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("nombre", `instructor-${course.wp_curso_id}`)
      const res  = await fetch("/api/upload/firma-instructor", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error ?? "Error subiendo la firma"); return }
      setFirmaUrl(data.url as string)
    } catch {
      setUploadError("Error de conexión al subir la firma")
    } finally {
      setUploadingFirma(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveError(null)
    if (!firmaUrl) { setSaveError("La firma del instructor es obligatoria"); return }
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await action(formData)
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3500)
      } else {
        setSaveError(result.error ?? "Error al guardar")
      }
    })
  }

  function handleSync() {
    setSyncError(null)
    const formData = new FormData()
    formData.append("wp_curso_id", String(course.wp_curso_id))
    formData.append("nombre_curso", course.nombre_curso)
    startSyncTransition(async () => {
      const result = await syncAction(formData)
      if (result.ok) {
        setSyncSuccess(true)
        setTimeout(() => setSyncSuccess(false), 3500)
        router.refresh()
      } else {
        setSyncError(result.error ?? "Error al sincronizar")
      }
    })
  }

  const isBlobUrl = firmaUrl.includes("blob.vercel-storage.com")
  const proxyUrl  = isBlobUrl ? `/api/upload/firma-proxy?url=${encodeURIComponent(firmaUrl)}` : firmaUrl

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        transition: "box-shadow 0.15s ease",
        "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
      }}
    >
      {/* Collapsed header */}
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 1.5,
          px: 2.5,
          py: 2,
          textAlign: "left",
          border: "none",
          bgcolor: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background-color 0.12s ease",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {/* Status dot */}
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: cfg.dot, flexShrink: 0 }} />

        {/* Course info */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {course.nombre_curso}
          </Typography>
          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
              ID {course.wp_curso_id}
            </Typography>
            {course.paquetes.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                sx={{
                  height: 16,
                  fontSize: "10px",
                  bgcolor: "rgba(167,139,250,0.1)",
                  color: "#7c3aed",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Right badges */}
        <Box sx={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 1 }}>
          {saved && (
            <Chip
              icon={<CheckCircle2 size={11} strokeWidth={2.5} />}
              label="Guardado"
              size="small"
              sx={{
                height: 22,
                fontSize: "11px",
                fontWeight: 600,
                bgcolor: "#f0fdf4",
                color: "#15803d",
                border: "1px solid #bbf7d0",
                "& .MuiChip-label": { px: 1 },
                "& .MuiChip-icon": { color: "#22c55e", ml: 0.75 },
              }}
            />
          )}
          {status !== "empty" && (
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: status === "complete" ? "#15803d" : "#b45309",
              }}
            >
              {completeness}/5
            </Typography>
          )}
          <Chip
            label={cfg.label}
            size="small"
            sx={{
              height: 22,
              fontSize: "10px",
              fontWeight: 600,
              border: "1px solid",
              borderColor: cfg.border,
              bgcolor: cfg.bg,
              color: cfg.color,
              "& .MuiChip-label": { px: 1.25 },
            }}
          />
          {open
            ? <ChevronUp   size={15} style={{ color: "#858382", flexShrink: 0 }} />
            : <ChevronDown size={15} style={{ color: "#858382", flexShrink: 0 }} />
          }
        </Box>
      </Box>

      {/* Expanded form */}
      {open && (
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            px: 2.5,
            py: 2.5,
          }}
        >
          {/* Sync bar */}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
              px: 2,
              py: 1.5,
              mb: 2.5,
            }}
          >
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Fuente:{" "}
              <Box component="strong" sx={{ color: "text.primary" }}>{m?.fuente ?? "Sin capturar"}</Box>
              {" · "}
              Última sincronización:{" "}
              <Box component="strong" sx={{ color: "text.primary" }}>
                {m?.ultima_sincronizacion ? formatDate(m.ultima_sincronizacion) : "Nunca"}
              </Box>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {syncSuccess && (
                <Chip
                  icon={<CheckCircle2 size={11} strokeWidth={2.5} />}
                  label="Sincronizado"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "11px",
                    fontWeight: 600,
                    bgcolor: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #bbf7d0",
                    "& .MuiChip-icon": { color: "#22c55e", ml: 0.75 },
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              )}
              {syncError && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <AlertCircle size={13} strokeWidth={2} style={{ color: "#dc2626" }} />
                  <Typography sx={{ fontSize: 12, color: "error.main" }}>{syncError}</Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                size="small"
                disabled={isSyncing}
                onClick={handleSync}
                startIcon={
                  <RotateCw
                    size={12}
                    strokeWidth={2}
                    style={{ animation: isSyncing ? "spin 0.8s linear infinite" : undefined }}
                  />
                }
                sx={{
                  height: 30,
                  fontSize: 12,
                  borderColor: "divider",
                  color: "text.secondary",
                  "&:hover": { borderColor: "text.secondary" },
                }}
              >
                {isSyncing ? "Sincronizando…" : "Sincronizar con Tutor"}
              </Button>
            </Box>
          </Paper>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gap: 2 }}
          >
            <input type="hidden" name="wp_curso_id" value={course.wp_curso_id} />
            <input type="hidden" name="firma_url"   value={firmaUrl} />

            {/* Nombre override */}
            <Field label="Nombre del curso (sobreescribe el título en el PDF)">
              <TextField
                name="nombre_curso"
                defaultValue={m?.nombre_curso ?? ""}
                placeholder={course.nombre_curso}
                size="small"
                fullWidth
              />
            </Field>

            {/* Duración + área nombre + área clave */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "100px 1fr 120px" },
                gap: 1.5,
              }}
            >
              <Field label="Duración (hrs)" required>
                <TextField
                  name="duracion_horas"
                  type="number"
                  defaultValue={m?.duracion_horas ?? ""}
                  placeholder="8"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                />
              </Field>
              <Field label="Área temática" required>
                <TextField
                  name="area_tematica_nombre"
                  defaultValue={m?.area_tematica_nombre ?? ""}
                  placeholder="Seguridad e Higiene en el Trabajo"
                  size="small"
                  fullWidth
                />
              </Field>
              <Field label="Clave área">
                <TextField
                  name="area_tematica_clave"
                  defaultValue={m?.area_tematica_clave ?? ""}
                  placeholder="SH-01"
                  size="small"
                  fullWidth
                />
              </Field>
            </Box>

            {/* Agente + registro */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 180px" },
                gap: 1.5,
              }}
            >
              <Field label="Agente capacitador" required>
                <TextField
                  name="agente_capacitador_nombre"
                  defaultValue={m?.agente_capacitador_nombre ?? ""}
                  placeholder="Desarrolla360 SA de CV"
                  size="small"
                  fullWidth
                />
              </Field>
              <Field label="Registro STPS">
                <TextField
                  name="agente_capacitador_registro"
                  defaultValue={m?.agente_capacitador_registro ?? ""}
                  placeholder="CAP-000-00000"
                  size="small"
                  fullWidth
                />
              </Field>
            </Box>

            {/* Instructor + firma */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              <Field label="Nombre del instructor" required>
                <TextField
                  name="instructor_nombre"
                  defaultValue={m?.instructor_nombre ?? ""}
                  placeholder="Lic. Juan García"
                  size="small"
                  fullWidth
                />
              </Field>

              <Field label="Firma del instructor" required>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {firmaUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyUrl}
                        alt="Firma del instructor"
                        style={{
                          height: 40,
                          width: 112,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          objectFit: "contain",
                          padding: 4,
                          background: "#fff",
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={uploadingFirma}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ height: 30, fontSize: 12, borderColor: "divider", color: "text.secondary" }}
                      >
                        {uploadingFirma ? "Subiendo…" : "Cambiar"}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => setFirmaUrl("")}
                        sx={{
                          width: 30,
                          height: 30,
                          border: "1px solid",
                          borderColor: "divider",
                          color: "text.secondary",
                          "&:hover": { borderColor: "error.main", color: "error.main", bgcolor: "rgba(239,68,68,0.06)" },
                        }}
                      >
                        <X size={14} />
                      </IconButton>
                    </>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={uploadingFirma}
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={<Upload size={14} strokeWidth={2} />}
                      sx={{
                        height: 36,
                        fontSize: 13,
                        borderStyle: "dashed",
                        borderColor: "divider",
                        color: "text.secondary",
                        "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "rgba(245,133,63,0.04)" },
                      }}
                    >
                      {uploadingFirma ? "Subiendo…" : "Subir firma"}
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={handleFirmaChange}
                  />
                </Box>
                {uploadError && (
                  <Typography sx={{ mt: 0.75, fontSize: 12, color: "error.main" }}>
                    {uploadError}
                  </Typography>
                )}
              </Field>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                pt: 2,
              }}
            >
              {saveError ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <AlertCircle size={13} strokeWidth={2} style={{ color: "#dc2626" }} />
                  <Typography sx={{ fontSize: 12, color: "error.main" }}>{saveError}</Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
                  <Box component="span" sx={{ color: "error.main" }}>*</Box>
                  {" "}Campos requeridos para emitir el DC-3
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={isPending}
                sx={{
                  borderRadius: "20px",
                  px: 3,
                  bgcolor: "#2DD4BF",
                  color: "#042f2e",
                  fontWeight: 600,
                  boxShadow: "none",
                  flexShrink: 0,
                  "&:hover": { bgcolor: "#14b8a6", boxShadow: "none" },
                  "&:disabled": { opacity: 0.6 },
                }}
              >
                {isPending ? "Guardando…" : "Guardar DC-3"}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  )
}

// ── Filter tabs ──────────────────────────────────────────────────────
type FilterValue = "all" | Status

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all",        label: "Todos" },
  { value: "complete",   label: "Completos" },
  { value: "incomplete", label: "Incompletos" },
  { value: "empty",      label: "Sin datos" },
]

// ── Main exported list ───────────────────────────────────────────────
export default function Dc3EditorList({
  courses,
  action,
  syncAction,
}: {
  courses: CourseEntry[]
  action: SaveAction
  syncAction: SyncAction
}) {
  const [filter, setFilter] = useState<FilterValue>("all")

  const counts: Record<FilterValue, number> = {
    all:        courses.length,
    complete:   courses.filter((c) => getStatus(c.metadata) === "complete").length,
    incomplete: courses.filter((c) => getStatus(c.metadata) === "incomplete").length,
    empty:      courses.filter((c) => getStatus(c.metadata) === "empty").length,
  }

  const filtered =
    filter === "all" ? courses : courses.filter((c) => getStatus(c.metadata) === filter)

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {/* Filter pills */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {FILTERS.map(({ value, label }) => {
          const active = filter === value
          return (
            <Box
              key={value}
              component="button"
              type="button"
              onClick={() => setFilter(value)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 2,
                py: 0.875,
                borderRadius: "20px",
                border: "1px solid",
                borderColor: active ? "transparent" : "divider",
                bgcolor: active ? "#0f172a" : "background.paper",
                color: active ? "#fff" : "text.secondary",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover:not([data-active])": { bgcolor: "action.hover", color: "text.primary" },
              }}
            >
              {label}
              <Box
                component="span"
                sx={{
                  px: 0.875,
                  py: 0.25,
                  borderRadius: "10px",
                  fontSize: "10px",
                  fontWeight: 600,
                  bgcolor: active ? "rgba(255,255,255,0.2)" : "action.hover",
                  color: active ? "#fff" : "text.secondary",
                }}
              >
                {counts[value]}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Course cards */}
      <Box sx={{ display: "grid", gap: 1 }}>
        {filtered.length === 0 ? (
          <Box
            sx={{
              borderRadius: 2,
              border: "1px dashed",
              borderColor: "divider",
              bgcolor: "background.paper",
              px: 2,
              py: 6,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No hay cursos en esta categoría.
            </Typography>
          </Box>
        ) : (
          filtered.map((course) => (
            <CourseEditorCard
              key={course.wp_curso_id}
              course={course}
              action={action}
              syncAction={syncAction}
            />
          ))
        )}
      </Box>
    </Box>
  )
}
