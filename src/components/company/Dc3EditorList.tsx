"use client"

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Search,
  Upload,
  X,
} from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import Paper from "@mui/material/Paper"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import EyebrowLabel from "@/components/shared/EyebrowLabel"
import { formatDate } from "@/lib/format"
import { amber, fd as brandColors, gray, green, portalColors, red, slate } from "@/lib/theme-tokens"

const DC3_PAGE_SIZE = 20

type CourseMetadata = {
  id: string
  course_name: string | null
  duration_hours: number | null
  subject_area_name: string | null
  subject_area_code: string | null
  training_agent_name: string | null
  training_agent_registration: string | null
  instructor_name: string | null
  instructor_signature_url: string | null
  grants_dc3: boolean
  source: string
  last_synced_at: Date | null
}

export type CourseEntry = {
  wpCourseId: number
  courseName: string
  metadata: CourseMetadata | null
}

type SaveAction = (formData: FormData) => Promise<{ ok: boolean; error?: string }>
type SyncAction = (formData: FormData) => Promise<{ ok: boolean; error?: string }>

type Status = "complete" | "incomplete" | "empty" | "not_applicable"

function getStatus(m: CourseMetadata | null): Status {
  if (m?.grants_dc3 === false) return "not_applicable"
  if (!m) return "empty"
  const ok =
    !!m.course_name &&
    m.duration_hours != null &&
    !!m.subject_area_name &&
    !!m.training_agent_name &&
    !!m.instructor_name &&
    !!m.instructor_signature_url
  return ok ? "complete" : "incomplete"
}

function getCompleteness(m: CourseMetadata | null): number {
  if (!m) return 0
  return [
    !!m.course_name,
    m.duration_hours != null,
    !!m.subject_area_name,
    !!m.training_agent_name,
    !!m.instructor_name,
    !!m.instructor_signature_url,
  ].filter(Boolean).length
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; color: string; border: string; dot: string }
> = {
  complete: {
    label: "Completo",
    bg: green[50],
    color: green[700],
    border: green[200],
    dot: green[500],
  },
  incomplete: {
    label: "Incompleto",
    bg: amber[50],
    color: amber[700],
    border: amber[200],
    dot: brandColors.accent,
  },
  empty: {
    label: "Sin datos",
    bg: slate[50],
    color: slate[500],
    border: slate[200],
    dot: slate[400],
  },
  not_applicable: {
    label: "No otorga DC-3",
    bg: slate[100],
    color: slate[600],
    border: slate[300],
    dot: slate[400],
  },
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      <EyebrowLabel color={slate[900]}>
        {label}
        {required && (
          <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>
            *
          </Box>
        )}
      </EyebrowLabel>
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
          color: slate[400],
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
  const [open, setOpen] = useState(defaultOpen ?? false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [grantsDc3, setGrantsDc3] = useState(course.metadata?.grants_dc3 ?? true)
  const [signatureUrl, setSignatureUrl] = useState(course.metadata?.instructor_signature_url ?? "")
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultOpen && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [isSyncing, startSyncTransition] = useTransition()
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const router = useRouter()

  const status = getStatus(course.metadata)
  const completeness = getCompleteness(course.metadata)
  const cfg = STATUS_CONFIG[status]
  const m = course.metadata

  async function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSignature(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("nombre", `instructor-${course.wpCourseId}`)
      fd.append("wpCourseId", String(course.wpCourseId))
      const res = await fetch("/api/upload/instructor-signature", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? "Error subiendo la firma")
        return
      }
      setSignatureUrl(data.url as string)
    } catch {
      setUploadError("Error de conexión al subir la firma")
    } finally {
      setUploadingSignature(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveError(null)
    if (grantsDc3 && !signatureUrl) {
      setSaveError("La firma del instructor es obligatoria")
      return
    }
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
    formData.append("wp_curso_id", String(course.wpCourseId))
    formData.append("nombre_curso", course.courseName)
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

  const isBlobUrl = signatureUrl.includes("blob.vercel-storage.com")
  const proxyUrl = isBlobUrl
    ? `/api/upload/signature-proxy?url=${encodeURIComponent(signatureUrl)}`
    : signatureUrl

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
            {course.courseName}
          </Typography>
          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
              ID {course.wpCourseId}
            </Typography>
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
                bgcolor: green[50],
                color: green[700],
                border: `1px solid ${green[200]}`,
                "& .MuiChip-label": { px: 1 },
                "& .MuiChip-icon": { color: green[500], ml: 0.75 },
              }}
            />
          )}
          {status !== "empty" && status !== "not_applicable" && (
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: status === "complete" ? green[700] : amber[700],
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
          {open ? (
            <ChevronUp size={15} style={{ color: portalColors.iconMuted, flexShrink: 0 }} />
          ) : (
            <ChevronDown size={15} style={{ color: portalColors.iconMuted, flexShrink: 0 }} />
          )}
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
              <Box component="strong" sx={{ color: "text.primary" }}>
                {m?.source ?? "Sin capturar"}
              </Box>
              {" · "}
              Última sincronización:{" "}
              <Box component="strong" sx={{ color: "text.primary" }}>
                {m?.last_synced_at ? formatDate(m.last_synced_at) : "Nunca"}
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
                    bgcolor: green[50],
                    color: green[700],
                    border: `1px solid ${green[200]}`,
                    "& .MuiChip-icon": { color: green[500], ml: 0.75 },
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              )}
              {syncError && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <AlertCircle size={13} strokeWidth={2} style={{ color: red[600] }} />
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

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2 }}>
            <input type="hidden" name="wp_curso_id" value={course.wpCourseId} />
            <input type="hidden" name="firma_url" value={signatureUrl} />

            <SectionLabel>Datos del curso</SectionLabel>

            <Box
              component="label"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                name="otorga_dc3"
                checked={grantsDc3}
                onChange={(e) => setGrantsDc3(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                Este curso otorga DC-3
              </Typography>
            </Box>

            <Field label="Nombre del curso" required>
              <TextField
                name="nombre_curso"
                defaultValue={m?.course_name ?? ""}
                placeholder={course.courseName}
                size="small"
                fullWidth
              />
            </Field>

            {grantsDc3 && (
              <>
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
                      defaultValue={m?.duration_hours ?? ""}
                      placeholder="8"
                      size="small"
                      fullWidth
                      slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    />
                  </Field>
                  <Field label="Área temática" required>
                    <TextField
                      name="area_tematica_nombre"
                      defaultValue={m?.subject_area_name ?? ""}
                      placeholder="Seguridad e Higiene en el Trabajo"
                      size="small"
                      fullWidth
                    />
                  </Field>
                  <Field label="Clave área">
                    <TextField
                      name="area_tematica_clave"
                      defaultValue={m?.subject_area_code ?? ""}
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
                      defaultValue={m?.training_agent_name ?? ""}
                      placeholder="Desarrolla360 SA de CV"
                      size="small"
                      fullWidth
                    />
                  </Field>
                  <Field label="Registro STPS">
                    <TextField
                      name="agente_capacitador_registro"
                      defaultValue={m?.training_agent_registration ?? ""}
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
                    defaultValue={m?.instructor_name ?? ""}
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
                onChange={handleSignatureChange}
              />

              {signatureUrl ? (
                <Box
                  sx={{
                    borderRadius: "12px",
                    border: `2px solid ${slate[800]}`,
                    overflow: "hidden",
                    boxShadow: `3px 3px 0px 0px ${slate[800]}`,
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
                      bgcolor: brandColors.background,
                      backgroundImage: `radial-gradient(circle, ${slate[300]} 1px, transparent 1px)`,
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
                      borderTop: `1.5px solid ${slate[200]}`,
                      bgcolor: slate[50],
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CheckCircle2 size={12} strokeWidth={2.5} style={{ color: green[500] }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: green[700] }}>
                        Firma cargada
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.75 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={uploadingSignature}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          height: 26,
                          fontSize: 11,
                          px: 1.25,
                          borderRadius: "6px",
                          borderColor: slate[300],
                          color: slate[500],
                          "&:hover": { borderColor: slate[400], bgcolor: "transparent" },
                        }}
                      >
                        {uploadingSignature ? "Subiendo…" : "Cambiar"}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => setSignatureUrl("")}
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "6px",
                          border: `1px solid ${slate[300]}`,
                          color: slate[400],
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
                  onClick={() => !uploadingSignature && fileInputRef.current?.click()}
                  sx={{
                    borderRadius: "12px",
                    border: "2px dashed",
                    borderColor: uploadingSignature ? "var(--portal-blue)" : slate[300],
                    bgcolor: uploadingSignature ? "rgba(53,121,245,0.03)" : "#fafafa",
                    cursor: uploadingSignature ? "default" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    py: 3.5,
                    transition: "all 0.18s ease",
                    "&:hover": uploadingSignature
                      ? {}
                      : {
                          borderColor: "var(--portal-blue)",
                          bgcolor: "rgba(53,121,245,0.04)",
                        },
                  }}
                >
                  {uploadingSignature ? (
                    <>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: `2.5px solid ${slate[200]}`,
                          borderTopColor: "var(--portal-blue)",
                          animation: "spin 0.7s linear infinite",
                          "@keyframes spin": { to: { transform: "rotate(360deg)" } },
                        }}
                      />
                      <Typography
                        sx={{ fontSize: 12, fontWeight: 600, color: "var(--portal-blue)" }}
                      >
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
                          bgcolor: slate[100],
                          border: `1.5px solid ${slate[200]}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 0.25,
                        }}
                      >
                        <Upload size={18} strokeWidth={1.5} style={{ color: slate[500] }} />
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: slate[800] }}>
                        Subir firma del instructor
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: slate[400] }}>
                        PNG, JPG o WEBP
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {uploadError && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                  <AlertCircle size={12} strokeWidth={2} style={{ color: red[600] }} />
                  <Typography sx={{ fontSize: 12, color: "error.main" }}>{uploadError}</Typography>
                </Box>
              )}
            </Field>
              </>
            )}

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
                  <AlertCircle size={13} strokeWidth={2} style={{ color: red[600] }} />
                  <Typography sx={{ fontSize: 12, color: "error.main" }}>{saveError}</Typography>
                </Box>
              ) : grantsDc3 ? (
                <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
                  <Box component="span" sx={{ color: "error.main" }}>
                    *
                  </Box>{" "}
                  Campos requeridos para emitir el DC-3
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
                  Este curso no emitirá constancia DC-3.
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
  { value: "all", label: "Todos" },
  { value: "complete", label: "Completos" },
  { value: "incomplete", label: "Incompletos" },
  { value: "empty", label: "Sin datos" },
  { value: "not_applicable", label: "No otorga DC-3" },
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
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const counts: Record<FilterValue, number> = {
    all: courses.length,
    complete: courses.filter((c) => getStatus(c.metadata) === "complete").length,
    incomplete: courses.filter((c) => getStatus(c.metadata) === "incomplete").length,
    empty: courses.filter((c) => getStatus(c.metadata) === "empty").length,
    not_applicable: courses.filter((c) => getStatus(c.metadata) === "not_applicable").length,
  }

  const statusFiltered =
    filter === "all" ? courses : courses.filter((c) => getStatus(c.metadata) === filter)
  const filtered = query.trim()
    ? statusFiltered.filter((c) => c.courseName.toLowerCase().includes(query.trim().toLowerCase()))
    : statusFiltered

  // A deep link to a specific course (e.g. from another page) should always be
  // able to find it, so pagination steps aside rather than hiding it on some
  // other page.
  const hasOpenTarget = openCourseId != null && filtered.some((c) => c.wpCourseId === openCourseId)
  const totalPages = Math.max(1, Math.ceil(filtered.length / DC3_PAGE_SIZE))
  const currentPage = hasOpenTarget ? 1 : Math.min(page, totalPages)
  const paged = hasOpenTarget
    ? filtered
    : filtered.slice((currentPage - 1) * DC3_PAGE_SIZE, currentPage * DC3_PAGE_SIZE)

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {FILTERS.map(({ value, label }) => {
            const active = filter === value
            return (
              <Box
                key={value}
                component="button"
                type="button"
                onClick={() => {
                  setFilter(value)
                  setPage(1)
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 2,
                  py: 0.875,
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: active ? "transparent" : "divider",
                  bgcolor: active ? slate[900] : "background.paper",
                  color: active ? brandColors.background : "text.secondary",
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
                    color: active ? brandColors.background : "text.secondary",
                  }}
                >
                  {counts[value]}
                </Box>
              </Box>
            )
          })}
        </Box>

        <TextField
          size="small"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar curso…"
          sx={{ width: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} style={{ color: gray[400] }} />
                </InputAdornment>
              ),
            },
          }}
        />
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
              {query.trim()
                ? `Sin resultados para "${query.trim()}".`
                : "No hay cursos en esta categoría."}
            </Typography>
          </Box>
        ) : (
          paged.map((course) => (
            <CourseEditorCard
              key={course.wpCourseId}
              course={course}
              action={action}
              syncAction={syncAction}
              defaultOpen={course.wpCourseId === openCourseId}
            />
          ))
        )}
      </Box>

      {!hasOpenTarget && totalPages > 1 && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} · página {currentPage} de{" "}
            {totalPages}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ height: 28, fontSize: 12 }}
            >
              ← Anterior
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              sx={{ height: 28, fontSize: 12 }}
            >
              Siguiente →
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}
