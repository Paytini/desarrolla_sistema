import Dc3EditorList, { type CourseEntry } from "@/components/portal/Dc3EditorList"
import AlertBanner from "@/components/portal/AlertBanner"
import KpiCard from "@/components/portal/KpiCard"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { AlertCircle, BarChart3, CheckCircle2, FileText } from "lucide-react"
import { redirect } from "next/navigation"
import { saveDc3MetadataAction } from "./actions"

function isComplete(m: CourseEntry["metadata"]): boolean {
  if (!m) return false
  return !!(m.duracion_horas != null && m.area_tematica_nombre && m.agente_capacitador_nombre && m.instructor_nombre)
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
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[1px] text-[#E8761A]">Operaciones</p>
        <h1 className="text-[24px] font-bold tracking-tight text-[#1a1a1a]">Editor DC-3</h1>
        <p className="text-[14px] text-[#64748b]">Configura la metadata oficial STPS por curso para emitir constancias DC-3 correctas.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total en catálogo" value={String(total)} sub="Cursos en paquetes" icon={FileText} borderColor="charcoal" />
        <KpiCard label="DC-3 completos" value={String(complete)} sub="4/4 campos obligatorios" icon={CheckCircle2} borderColor="orange" />
        <KpiCard label="Incompletos" value={String(incomplete)} sub="Con datos parciales" icon={AlertCircle} borderColor="amber" />
        <KpiCard label="Sin datos" value={String(empty)} sub="Sin ningún campo" icon={AlertCircle} borderColor="rose" />
      </div>

      {incomplete + empty > 0 && (
        <AlertBanner
          tone="amber"
          title={`${incomplete + empty} cursos sin metadata DC-3 completa`}
          description="Las constancias no podrán generarse hasta completar el CNO-11, área temática y agente capacitador."
        />
      )}

      {total > 0 && (
        <div className="rounded-xl border border-[#f0f0f0] bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-[#1a1a1a]">Completitud global del catálogo</span>
            <span className="text-[13.5px] font-bold text-[#1a1a1a]">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[#94a3b8]">
            {complete} de {total} cursos tienen los 4 campos obligatorios completos.
          </p>
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-white px-4 py-12 text-center text-sm text-[#94a3b8]">
          No hay cursos en ningún paquete. Crea un paquete con cursos para configurar su DC-3.
        </div>
      ) : (
        <Dc3EditorList courses={courses} action={saveDc3MetadataAction} />
      )}
    </div>
  )
}
