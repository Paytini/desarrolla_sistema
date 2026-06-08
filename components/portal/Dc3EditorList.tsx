"use client"

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Upload,
  X,
} from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
    !!m.instructor_nombre
  return ok ? "complete" : "incomplete"
}

function getCompleteness(m: CourseMetadata | null): number {
  if (!m) return 0
  return [
    m.duracion_horas != null,
    !!m.area_tematica_nombre,
    !!m.agente_capacitador_nombre,
    !!m.instructor_nombre,
  ].filter(Boolean).length
}

const STATUS_CONFIG: Record<Status, { label: string; badge: string; dot: string }> = {
  complete:   { label: "Completo",   badge: "bg-teal-100 text-teal-800",   dot: "bg-teal-500" },
  incomplete: { label: "Incompleto", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  empty:      { label: "Sin datos",  badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
}

// ── Input helper ────────────────────────────────────────────────────
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
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"

// ── Single course editor card ────────────────────────────────────────
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
  const [firmaUrl, setFirmaUrl] = useState(course.metadata?.instructor_firma_url ?? "")
  const [uploadingFirma, setUploadingFirma] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSyncing, startSyncTransition] = useTransition()
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const router = useRouter()

  const status = getStatus(course.metadata)
  const completeness = getCompleteness(course.metadata)
  const cfg = STATUS_CONFIG[status]
  const m = course.metadata

  async function handleFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFirma(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("nombre", `instructor-${course.wp_curso_id}`)
      const res = await fetch("/api/upload/firma-instructor", { method: "POST", body: fd })
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
  const proxyUrl = isBlobUrl
    ? `/api/upload/firma-proxy?url=${encodeURIComponent(firmaUrl)}`
    : firmaUrl

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50/60"
      >
        <span className={`size-2.5 shrink-0 rounded-full ${cfg.dot}`} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {course.nombre_curso}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">ID {course.wp_curso_id}</span>
            {course.paquetes.map((p) => (
              <span
                key={p}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
              <CheckCircle2 size={11} strokeWidth={2.5} />
              Guardado
            </span>
          )}

          {status !== "empty" && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                status === "complete" ? "text-teal-600" : "text-amber-600"
              }`}
            >
              {completeness}/4
            </span>
          )}

          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>

          {open ? (
            <ChevronUp size={15} className="text-slate-400" />
          ) : (
            <ChevronDown size={15} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded form */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5">
          {/* Sync bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">
              Fuente:{" "}
              <strong className="text-slate-700">{m?.fuente ?? "Sin capturar"}</strong>
              {" · "}
              Última sincronización:{" "}
              <strong className="text-slate-700">
                {m?.ultima_sincronizacion ? formatDate(m.ultima_sincronizacion) : "Nunca"}
              </strong>
            </p>
            <div className="flex items-center gap-2.5">
              {syncSuccess && (
                <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  Sincronizado
                </span>
              )}
              {syncError && (
                <p className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle size={13} strokeWidth={2} />
                  {syncError}
                </p>
              )}
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RotateCw size={12} strokeWidth={2} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Sincronizando…" : "Sincronizar con Tutor"}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="wp_curso_id" value={course.wp_curso_id} />
            <input type="hidden" name="firma_url" value={firmaUrl} />

            {/* Nombre override */}
            <Field label="Nombre del curso (sobreescribe el título en el PDF)">
              <input
                type="text"
                name="nombre_curso"
                defaultValue={m?.nombre_curso ?? ""}
                placeholder={course.nombre_curso}
                className={inputCls}
              />
            </Field>

            {/* Duración + área nombre + área clave */}
            <div className="grid gap-3 sm:grid-cols-[100px_1fr_120px]">
              <Field label="Duración (hrs)" required>
                <input
                  type="number"
                  name="duracion_horas"
                  defaultValue={m?.duracion_horas ?? ""}
                  min={0}
                  step={0.5}
                  placeholder="8"
                  className={inputCls}
                />
              </Field>
              <Field label="Área temática" required>
                <input
                  type="text"
                  name="area_tematica_nombre"
                  defaultValue={m?.area_tematica_nombre ?? ""}
                  placeholder="Seguridad e Higiene en el Trabajo"
                  className={inputCls}
                />
              </Field>
              <Field label="Clave área">
                <input
                  type="text"
                  name="area_tematica_clave"
                  defaultValue={m?.area_tematica_clave ?? ""}
                  placeholder="SH-01"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Agente capacitador + registro */}
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <Field label="Agente capacitador" required>
                <input
                  type="text"
                  name="agente_capacitador_nombre"
                  defaultValue={m?.agente_capacitador_nombre ?? ""}
                  placeholder="Desarrolla360 SA de CV"
                  className={inputCls}
                />
              </Field>
              <Field label="Registro STPS">
                <input
                  type="text"
                  name="agente_capacitador_registro"
                  defaultValue={m?.agente_capacitador_registro ?? ""}
                  placeholder="CAP-000-00000"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Instructor + firma */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre del instructor" required>
                <input
                  type="text"
                  name="instructor_nombre"
                  defaultValue={m?.instructor_nombre ?? ""}
                  placeholder="Lic. Juan García"
                  className={inputCls}
                />
              </Field>

              <Field label="Firma del instructor">
                <div className="flex items-center gap-2.5">
                  {firmaUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyUrl}
                        alt="Firma del instructor"
                        className="h-10 w-28 rounded-lg border border-slate-200 bg-white object-contain p-1"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFirma}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {uploadingFirma ? "Subiendo…" : "Cambiar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFirmaUrl("")}
                        className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFirma}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-teal-400 hover:bg-teal-50/40 hover:text-teal-700 disabled:opacity-50"
                    >
                      <Upload size={14} strokeWidth={2} />
                      {uploadingFirma ? "Subiendo…" : "Subir firma"}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFirmaChange}
                  />
                </div>
                {uploadError && (
                  <p className="mt-1 text-xs text-rose-600">{uploadError}</p>
                )}
              </Field>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              {saveError ? (
                <p className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle size={13} strokeWidth={2} />
                  {saveError}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  <span className="text-rose-500">*</span> Campos requeridos para emitir el DC-3
                </p>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-teal-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {isPending ? "Guardando…" : "Guardar DC-3"}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
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

  const filtered = filter === "all" ? courses : courses.filter((c) => getStatus(c.metadata) === filter)

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === value
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                filter === value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No hay cursos en esta categoría.
          </div>
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
      </div>
    </div>
  )
}
