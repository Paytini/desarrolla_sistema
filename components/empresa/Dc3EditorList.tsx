"use client"

import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RotateCw, Upload, X } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
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
    !!m.nombre_curso &&
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
    !!m.nombre_curso,
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      <Typography
        sx={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#0f172a",
        }}
      >
        {label}
        {required && <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>*</Box>}
      </Typography>
      {children}
    </Box>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.5 }}>
      <Typography
        sx={{
          fontSize: "9px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#94a3b8",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
    </Box>
  )
}

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
  const cardRef                         = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultOpen && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150)
    }
  }, [])
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
      ref={cardRef}
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
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: cfg.dot, flexShrink: 0 }} />

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
              {completeness}/6
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

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gap: 2 }}
          >
            <input type="hidden" name="wp_curso_id" value={course.wp_curso_id} />
            <input type="hidden" name="firma_url"   value={firmaUrl} />

            <SectionLabel>Datos del curso</SectionLabel>

            <Field label="Nombre del curso" required>
              <TextField
                name="nombre_curso"
                defaultValue={m?.nombre_curso ?? ""}
                placeholder={course.nombre_curso}
                size="small"
                fullWidth
              />
            </Field>

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

            <SectionLabel>Agente capacitador</SectionLabel>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 200px" },
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

            <SectionLabel>Instructor</SectionLabel>

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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={handleFirmaChange}
                />

                {firmaUrl ? (
                  <Box
                    sx={{
                      borderRadius: "12px",
                      border: "2px solid #1E293B",
                      overflow: "hidden",
                      boxShadow: "3px 3px 0px 0px #1E293B",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 100,
                        py: 3,
                        px: 4,
                        bgcolor: "#ffffff",
                        backgroundImage:
                          "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                        backgroundSize: "18px 18px",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyUrl}
                        alt="Firma del instructor"
                        style={{
                          maxHeight: 80,
                          maxWidth: "100%",
                          objectFit: "contain",
                          position: "relative",
                          zIndex: 1,
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTop: "1.5px solid #e2e8f0",
                        bgcolor: "#f8fafc",
                        px: 2,
                        py: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <CheckCircle2 size={12} strokeWidth={2.5} style={{ color: "#22c55e" }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#15803d" }}>
                          Firma cargada
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.75 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={uploadingFirma}
                          onClick={() => fileInputRef.current?.click()}
                          sx={{
                            height: 26,
                            fontSize: 11,
                            px: 1.25,
                            borderRadius: "6px",
                            borderColor: "#CBD5E1",
                            color: "#64748b",
                            "&:hover": { borderColor: "#94a3b8", bgcolor: "transparent" },
                          }}
                        >
                          {uploadingFirma ? "Subiendo…" : "Cambiar"}
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => setFirmaUrl("")}
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: "6px",
                            border: "1px solid #CBD5E1",
                            color: "#94a3b8",
                            "&:hover": {
                              borderColor: "#fca5a5",
                              color: "#ef4444",
                              bgcolor: "rgba(239,68,68,0.06)",
                            },
                          }}
                        >
                          <X size={12} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    onClick={() => !uploadingFirma && fileInputRef.current?.click()}
                    sx={{
                      borderRadius: "12px",
                      border: "2px dashed",
                      borderColor: uploadingFirma ? "#8B5CF6" : "#CBD5E1",
                      bgcolor: uploadingFirma ? "rgba(139,92,246,0.03)" : "#fafafa",
                      cursor: uploadingFirma ? "default" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      py: 3.5,
                      transition: "all 0.18s ease",
                      "&:hover": uploadingFirma
                        ? {}
                        : {
                            borderColor: "#8B5CF6",
                            bgcolor: "rgba(139,92,246,0.04)",
                            boxShadow: "3px 3px 0px 0px rgba(139,92,246,0.18)",
                          },
                    }}
                  >
                    {uploadingFirma ? (
                      <>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "2.5px solid #e2e8f0",
                            borderTopColor: "#8B5CF6",
                            animation: "spin 0.7s linear infinite",
                            "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                          }}
                        />
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#8B5CF6" }}>
                          Subiendo firma…
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "10px",
                            bgcolor: "#f1f5f9",
                            border: "1.5px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mb: 0.25,
                          }}
                        >
                          <Upload size={18} strokeWidth={1.5} style={{ color: "#64748b" }} />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                          Subir firma del instructor
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>
                          PNG, JPG o WEBP
                        </Typography>
                      </>
                    )}
                  </Box>
                )}

                {uploadError && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                    <AlertCircle size={12} strokeWidth={2} style={{ color: "#dc2626" }} />
                    <Typography sx={{ fontSize: 12, color: "error.main" }}>{uploadError}</Typography>
                  </Box>
                )}
            </Field>

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

type FilterValue = "all" | Status

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all",        label: "Todos" },
  { value: "complete",   label: "Completos" },
  { value: "incomplete", label: "Incompletos" },
  { value: "empty",      label: "Sin datos" },
]

export default function Dc3EditorList({
  courses,
  action,
  syncAction,
  openCourseId,
}: {
  courses: CourseEntry[]
  action: SaveAction
  syncAction: SyncAction
  openCourseId?: number | null
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
              defaultOpen={course.wp_curso_id === openCourseId}
            />
          ))
        )}
      </Box>
    </Box>
  )
}
