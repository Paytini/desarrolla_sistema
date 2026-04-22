import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function EmpresaProgresoPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      empleados: {
        where: { activo: true },
        include: {
          cursos: {
            orderBy: [{ progreso_pct: "desc" }, { nombre_curso: "asc" }],
          },
        },
        orderBy: { nombre: "asc" },
      },
    },
  })

  if (!empresa) {
    redirect("/login")
  }

  const empleados = empresa.empleados
  const allCourses = empleados.flatMap((empleado) => empleado.cursos)
  const averageProgress = allCourses.length
    ? Math.round(allCourses.reduce((sum, course) => sum + course.progreso_pct, 0) / allCourses.length)
    : 0
  const employeesWithDelay = empleados.filter((empleado) => {
    if (empleado.cursos.length === 0) return false
    const employeeAverage =
      empleado.cursos.reduce((sum, course) => sum + course.progreso_pct, 0) / empleado.cursos.length
    return employeeAverage < 25 || empleado.cursos.some((course) => course.acceso_estado === "ERROR")
  }).length
  const completedCourses = allCourses.filter((course) => course.completado).length
  const startedCourses = allCourses.filter((course) => course.progreso_pct > 0).length

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

    if (course.completado) {
      current.completed += 1
    } else if (course.progreso_pct > 0) {
      current.inProgress += 1
    } else {
      current.notStarted += 1
    }

    courseMap.set(course.wp_curso_id, current)
  }

  const courseSummaries = [...courseMap.entries()]
    .map(([courseId, summary]) => ({
      courseId,
      ...summary,
      averageProgress: summary.assigned ? Math.round(summary.totalProgress / summary.assigned) : 0,
    }))
    .sort((left, right) => {
      if (left.completed !== right.completed) {
        return right.completed - left.completed
      }
      return left.nombre.localeCompare(right.nombre, "es-MX")
    })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Empresa / RH"
        title="Progreso y trayectorias"
        description="Aqui RH puede revisar el avance real por empleado y por curso, detectar rezago y dar seguimiento antes de que impacte el cumplimiento."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Avance promedio"
          value={`${averageProgress}%`}
          description="Promedio agregado entre todos los cursos sincronizados de la empresa."
          accent="violet"
        />
        <InfoCard
          title="Empleados con rezago"
          value={String(employeesWithDelay)}
          description="Colaboradores con avance bajo o cursos marcados con error de acceso."
          accent="amber"
        />
        <InfoCard
          title="Cursos iniciados"
          value={String(startedCourses)}
          description="Asignaciones que ya registran actividad real dentro de Tutor LMS."
          accent="teal"
        />
        <InfoCard
          title="Cursos completados"
          value={String(completedCourses)}
          description="Cursos ya cerrados por los empleados activos de la empresa."
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Avance por empleado</h2>
            <p className="text-sm leading-6 text-slate-600">
              Vista consolidada por colaborador para ubicar a quien necesita seguimiento puntual.
            </p>
          </div>

          <div className="space-y-4">
            {empleados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No hay empleados activos con progreso para mostrar.
              </div>
            ) : null}

            {empleados.map((empleado) => {
              const employeeCourses = empleado.cursos
              const employeeAverage = employeeCourses.length
                ? Math.round(
                    employeeCourses.reduce((sum, course) => sum + course.progreso_pct, 0) /
                      employeeCourses.length
                  )
                : 0
              const completed = employeeCourses.filter((course) => course.completado).length
              const inProgress = employeeCourses.filter(
                (course) => !course.completado && course.progreso_pct > 0
              ).length
              const notStarted = employeeCourses.filter((course) => course.progreso_pct === 0).length
              const accessErrors = employeeCourses.filter((course) => course.acceso_estado === "ERROR").length
              const lastSync = [...employeeCourses]
                .sort(
                  (left, right) =>
                    new Date(right.ultima_sincronizacion).getTime() -
                    new Date(left.ultima_sincronizacion).getTime()
                )[0]?.ultima_sincronizacion

              return (
                <article
                  key={empleado.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-950">
                          {empleado.nombre} {empleado.apellido}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            accessErrors > 0
                              ? "bg-rose-100 text-rose-900"
                              : employeeAverage >= 75
                                ? "bg-teal-100 text-teal-900"
                                : employeeAverage > 0
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {accessErrors > 0
                            ? "Requiere revision"
                            : employeeAverage >= 75
                              ? "Buen ritmo"
                              : employeeAverage > 0
                                ? "En seguimiento"
                                : "Sin actividad"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Avance promedio del colaborador</span>
                          <span className="font-medium text-slate-900">{employeeAverage}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-violet-600"
                            style={{ width: `${employeeAverage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-800">Correo:</span> {empleado.email}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Ultima sincronizacion:</span>{" "}
                          {formatDateTime(lastSync)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Completados:</span> {completed}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">En progreso:</span> {inProgress}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Sin iniciar:</span> {notStarted}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Alertas de acceso:</span> {accessErrors}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Resumen por curso</h2>
            <p className="text-sm leading-6 text-slate-600">
              Asi puede ver RH que cursos avanzan bien y cuales siguen rezagados dentro de la empresa.
            </p>
          </div>

          <div className="space-y-4">
            {courseSummaries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay cursos sincronizados en la empresa.
              </div>
            ) : null}

            {courseSummaries.map((course) => (
              <article
                key={course.courseId}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-950">{course.nombre}</h3>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Curso ID {course.courseId}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Avance promedio del curso</span>
                      <span className="font-medium text-slate-900">{course.averageProgress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${course.averageProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-800">Asignados:</span> {course.assigned}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Completados:</span> {course.completed}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">En progreso:</span> {course.inProgress}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Sin iniciar:</span> {course.notStarted}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
