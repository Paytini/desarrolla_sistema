import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { AlertCircle, BarChart3, BookOpen, CheckCircle } from "lucide-react"
import { SearchInput } from "@/components/shared/SearchInput"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmpresaProgresoPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const params = await searchParams
  const searchQuery = (readSearchParam(params, "q") ?? "").trim().toLowerCase()

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      empleados: {
        where: { activo: true },
        include: {
          cursos: { orderBy: [{ progreso_pct: "desc" }, { nombre_curso: "asc" }] },
        },
        orderBy: { nombre: "asc" },
      },
      paquetes: {
        where: { activo: true },
        include: {
          paquete: {
            include: {
              cursos: { select: { wp_curso_id: true, portada_url: true } },
            },
          },
        },
        take: 1,
      },
    },
  })

  if (!empresa) redirect("/login")

  const packageCourses = empresa.paquetes[0]?.paquete?.cursos ?? []
  const thumbnailMap = new Map<number, string>(
    packageCourses
      .filter((c) => c.portada_url)
      .map((c) => [c.wp_curso_id, c.portada_url as string])
  )

  const empleados = empresa.empleados
  const filteredEmpleados = searchQuery
    ? empleados.filter((e) =>
        `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchQuery) ||
        e.email.toLowerCase().includes(searchQuery)
      )
    : empleados
  const allCourses = empleados.flatMap((e) => e.cursos)
  const averageProgress = allCourses.length
    ? Math.round(allCourses.reduce((sum, c) => sum + c.progreso_pct, 0) / allCourses.length)
    : 0
  const employeesWithDelay = empleados.filter((e) => {
    if (e.cursos.length === 0) return false
    const avg = e.cursos.reduce((s, c) => s + c.progreso_pct, 0) / e.cursos.length
    return avg < 25 || e.cursos.some((c) => c.acceso_estado === "ERROR")
  }).length
  const completedCourses = allCourses.filter((c) => c.completado).length
  const startedCourses = allCourses.filter((c) => c.progreso_pct > 0).length

  const courseMap = new Map<
    number,
    {
      nombre: string
      assigned: number
      completed: number
      inProgress: number
      notStarted: number
      totalProgress: number
    }
  >()

  for (const course of allCourses) {
    const current = courseMap.get(course.wp_curso_id) ?? {
      nombre: course.nombre_curso,
      assigned: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      totalProgress: 0,
    }
    current.assigned += 1
    current.totalProgress += course.progreso_pct
    if (course.completado) current.completed += 1
    else if (course.progreso_pct > 0) current.inProgress += 1
    else current.notStarted += 1
    courseMap.set(course.wp_curso_id, current)
  }

  const courseSummaries = [...courseMap.entries()]
    .map(([courseId, summary]) => ({
      courseId,
      ...summary,
      averageProgress: summary.assigned
        ? Math.round(summary.totalProgress / summary.assigned)
        : 0,
    }))
    .sort((a, b) => {
      if (a.completed !== b.completed) return b.completed - a.completed
      return a.nombre.localeCompare(b.nombre, "es-MX")
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progreso"
        description="Avance y actividad de cursos por colaborador"
        breadcrumbs={[{ label: "Empresa", href: "/empresa/inicio" }, { label: "Progreso" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Avance promedio" value={`${averageProgress}%`} sub="Todos los cursos" icon={BarChart3} borderColor="orange" />
        <KpiCard label="Con rezago" value={String(employeesWithDelay)} sub="Avance < 25% o con error" icon={AlertCircle} borderColor="amber" />
        <KpiCard label="Cursos iniciados" value={String(startedCourses)} sub="Con actividad real" icon={BookOpen} borderColor="charcoal" />
        <KpiCard label="Cursos completados" value={String(completedCourses)} sub="Cerrados por empleados" icon={CheckCircle} borderColor="emerald" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              Avance por empleado
              <span className="ml-2 text-sm font-normal text-slate-400">
                {searchQuery ? `${filteredEmpleados.length} de ${empleados.length}` : empleados.length}
              </span>
            </h2>
            <form className="flex gap-2">
              <SearchInput
                name="q"
                defaultValue={searchQuery}
                placeholder="Buscar empleado..."
                width={208}
              />
              <button
                type="submit"
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] transition hover:bg-gray-50"
              >
                Buscar
              </button>
              {searchQuery && (
                <a
                  href="?"
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#6B7280] transition hover:bg-gray-50"
                >
                  Limpiar
                </a>
              )}
            </form>
          </div>

          {filteredEmpleados.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              {searchQuery ? `Sin resultados para "${searchQuery}".` : "No hay empleados activos con progreso para mostrar."}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredEmpleados.map((empleado) => {
                const courses = empleado.cursos
                const avg = courses.length
                  ? Math.round(courses.reduce((s, c) => s + c.progreso_pct, 0) / courses.length)
                  : 0
                const completed = courses.filter((c) => c.completado).length
                const inProgress = courses.filter((c) => !c.completado && c.progreso_pct > 0).length
                const errors = courses.filter((c) => c.acceso_estado === "ERROR").length
                const lastSync = [...courses].sort(
                  (a, b) =>
                    new Date(b.ultima_sincronizacion).getTime() -
                    new Date(a.ultima_sincronizacion).getTime()
                )[0]?.ultima_sincronizacion

                const statusVariant: "red" | "green" | "amber" | "slate" =
                  errors > 0
                    ? "red"
                    : avg >= 75
                      ? "green"
                      : avg > 0
                        ? "amber"
                        : "slate"

                const statusLabel =
                  errors > 0
                    ? "Requiere revisión"
                    : avg >= 75
                      ? "Buen ritmo"
                      : avg > 0
                        ? "En seguimiento"
                        : "Sin actividad"

                const barColor =
                  errors > 0
                    ? "bg-rose-500"
                    : avg >= 75
                      ? "bg-[#3579F5]"
                      : avg > 0
                        ? "bg-amber-500"
                        : "bg-slate-300"

                const initials = getInitials(`${empleado.nombre} ${empleado.apellido}`)

                return (
                  <div
                    key={empleado.id}
                    className="rounded-lg bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-center gap-2.5">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          errors > 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-[#EAF1FE] text-[#3579F5]"
                        }`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {empleado.nombre} {empleado.apellido}
                        </p>
                        <StatusBadge variant={statusVariant}>
                          {statusLabel}
                        </StatusBadge>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-slate-950">{avg}%</p>
                    </div>

                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${avg}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{completed} completados · {inProgress} en curso</span>
                      {lastSync && (
                        <span className="text-right">{formatDateTime(lastSync)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-950">
            Resumen por curso
            <span className="ml-2 text-sm font-normal text-slate-400">{courseSummaries.length}</span>
          </h2>

          {courseSummaries.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no hay cursos sincronizados.
            </div>
          ) : (
            <div className="space-y-3">
              {courseSummaries.map((course) => {
                const thumb = thumbnailMap.get(course.courseId)
                return (
                  <div key={course.courseId} className="overflow-hidden rounded-lg bg-white">
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={thumb} alt="" className="h-[90px] w-full object-cover" />
                    ) : (
                      <div className="flex h-[56px] items-center justify-center bg-[#EAF1FE]">
                        <span className="text-xl font-bold text-[#3579F5]/20">
                          {course.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-slate-950">{course.nombre}</p>
                        <span className="shrink-0 text-sm font-bold text-slate-950">
                          {course.averageProgress}%
                        </span>
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#3579F5]"
                          style={{ width: `${course.averageProgress}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span>{course.assigned} asignados</span>
                        <span className="text-[#3579F5]">{course.completed} completados</span>
                        <span>{course.inProgress} en curso</span>
                        <span>{course.notStarted} sin iniciar</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
