import Dc3EditorList, { type CourseEntry } from "@/components/portal/Dc3EditorList"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { AlertCircle, CheckCircle2, FileCheck2, type LucideIcon, MinusCircle } from "lucide-react"
import { redirect } from "next/navigation"
import { saveDc3MetadataAction } from "./actions"

function isComplete(m: CourseEntry["metadata"]): boolean {
  if (!m) return false
  return !!(m.duracion_horas != null && m.area_tematica_nombre && m.agente_capacitador_nombre && m.instructor_nombre)
}

function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconCls,
}: {
  label: string
  value: string
  sub?: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

export default async function SuperadminDc3Page() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  // Unique courses from all packages
  const paqueteCursos = await prisma.paqueteCurso.findMany({
    select: {
      wp_curso_id: true,
      nombre_curso: true,
      paquete: { select: { nombre: true } },
    },
    orderBy: { nombre_curso: "asc" },
  })

  // Deduplicate by wp_curso_id, collect package names
  const courseMap = new Map<number, { nombre_curso: string; paquetes: string[] }>()
  for (const pc of paqueteCursos) {
    const existing = courseMap.get(pc.wp_curso_id)
    if (existing) {
      if (!existing.paquetes.includes(pc.paquete.nombre)) {
        existing.paquetes.push(pc.paquete.nombre)
      }
    } else {
      courseMap.set(pc.wp_curso_id, {
        nombre_curso: pc.nombre_curso,
        paquetes: [pc.paquete.nombre],
      })
    }
  }

  const allMetadata = await prisma.cursoDc3Metadata.findMany()
  const metadataMap = new Map(allMetadata.map((m) => [m.wp_curso_id, m]))

  const courses: CourseEntry[] = [...courseMap.entries()].map(([wpId, info]) => ({
    wp_curso_id: wpId,
    nombre_curso: info.nombre_curso,
    paquetes: info.paquetes,
    metadata: metadataMap.get(wpId) ?? null,
  }))

  const total = courses.length
  const complete = courses.filter((c) => isComplete(c.metadata)).length
  const incomplete = courses.filter((c) => c.metadata && !isComplete(c.metadata)).length
  const empty = courses.filter((c) => !c.metadata).length
  const pct = total ? Math.round((complete / total) * 100) : 0

  return (
    <div className="space-y-6">
      <header className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          SuperAdmin
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Editor DC-3</h1>
        <p className="text-sm text-slate-400">
          Configura la metadata oficial STPS por curso para emitir constancias DC-3 correctas.
        </p>
      </header>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total en catálogo"
          value={String(total)}
          sub="Cursos en paquetes"
          Icon={FileCheck2}
          iconCls="bg-slate-100 text-slate-500"
        />
        <KpiCard
          label="DC-3 completos"
          value={String(complete)}
          sub="4/4 campos obligatorios"
          Icon={CheckCircle2}
          iconCls="bg-teal-50 text-teal-600"
        />
        <KpiCard
          label="Incompletos"
          value={String(incomplete)}
          sub="Con datos parciales"
          Icon={AlertCircle}
          iconCls="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Sin datos"
          value={String(empty)}
          sub="Sin ningún campo"
          Icon={MinusCircle}
          iconCls="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Global progress bar */}
      {total > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Completitud global del catálogo</span>
            <span className="font-bold text-slate-950">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                pct === 100 ? "bg-teal-500" : pct >= 60 ? "bg-amber-400" : "bg-rose-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {complete} de {total} cursos tienen los 4 campos obligatorios completos.
          </p>
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          No hay cursos en ningún paquete. Crea un paquete con cursos para configurar su DC-3.
        </div>
      ) : (
        <Dc3EditorList courses={courses} action={saveDc3MetadataAction} />
      )}
    </div>
  )
}
