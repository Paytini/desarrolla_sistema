import Dc3EditorList, { type CourseEntry } from "@/components/portal/Dc3EditorList"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSuperadminDc3Snapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities } from "@/lib/format"
import { getSession } from "@/lib/session"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { AlertCircle, AlertTriangle, BarChart3, CheckCircle2, FileText } from "lucide-react"
import { redirect } from "next/navigation"
import { saveDc3MetadataAction, syncDc3MetadataAction } from "./actions"

function isComplete(m: CourseEntry["metadata"]): boolean {
  if (!m) return false
  return !!(m.duracion_horas != null && m.area_tematica_nombre && m.agente_capacitador_nombre && m.instructor_nombre)
}

export default async function SuperadminDc3Page() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { publishedCourses, metadata, paqueteCursos } = await getSuperadminDc3Snapshot()

  const packagesByCourseId = new Map<number, string[]>()
  for (const pc of paqueteCursos) {
    const existing = packagesByCourseId.get(pc.wp_curso_id)
    if (existing) {
      if (!existing.includes(pc.paquete.nombre)) existing.push(pc.paquete.nombre)
    } else {
      packagesByCourseId.set(pc.wp_curso_id, [pc.paquete.nombre])
    }
  }

  const metadataMap = new Map(metadata.map((m) => [m.wp_curso_id, m]))

  const courses: CourseEntry[] = publishedCourses.map((course) => ({
    wp_curso_id: course.wp_course_id,
    nombre_curso: decodeHtmlEntities(course.title),
    paquetes: packagesByCourseId.get(course.wp_course_id) ?? [],
    metadata: metadataMap.get(course.wp_course_id) ?? null,
  }))

  const total = courses.length
  const complete = courses.filter((c) => isComplete(c.metadata)).length
  const incomplete = courses.filter((c) => c.metadata && !isComplete(c.metadata)).length
  const empty = courses.filter((c) => !c.metadata).length
  const pct = total ? Math.round((complete / total) * 100) : 0
  const barColor = pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-rose-500"

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SuperAdmin · Operaciones"
        title="Editor DC-3"
        description="Configura la metadata oficial STPS por curso para emitir constancias DC-3 correctas."
      />

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total en catálogo", value: total, sub: "Cursos publicados", icon: FileText, cls: "bg-slate-100 text-slate-600" },
          { label: "DC-3 completos", value: complete, sub: "4/4 campos obligatorios", icon: CheckCircle2, cls: "bg-green-50 text-green-600" },
          { label: "Incompletos", value: incomplete, sub: "Con datos parciales", icon: AlertCircle, cls: "bg-amber-50 text-amber-600" },
          { label: "Sin datos", value: empty, sub: "Sin ningún campo", icon: AlertTriangle, cls: empty > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500" },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                  <Icon size={16} strokeWidth={2} />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning */}
      {incomplete + empty > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="size-4" />
          <AlertTitle>{incomplete + empty} cursos sin metadata DC-3 completa</AlertTitle>
          <AlertDescription>
            Las constancias no podrán generarse hasta completar el CNO-11, área temática y agente capacitador.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-950">Completitud global del catálogo</span>
              </div>
              <span className="text-sm font-bold text-slate-950">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {complete} de {total} cursos tienen los 4 campos obligatorios completos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Course list */}
      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">
              No se encontraron cursos publicados en el catálogo de WordPress/Tutor LMS.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Dc3EditorList courses={courses} action={saveDc3MetadataAction} syncAction={syncDc3MetadataAction} />
      )}
    </div>
  )
}
