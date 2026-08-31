import EmptyState from "@/components/shared/EmptyState"
import { ExpandableChartCard } from "@/components/shared/ExpandableChartCard"
import { CourseDepartmentFilter } from "@/components/company/CourseDepartmentFilter"
import { DepartmentProgressChart } from "@/components/company/DepartmentProgressChart"
import { LearningActivityChart } from "@/components/company/LearningActivityChart"
import { PageHeader } from "@/components/shared/PageHeader"
import ProgressBar from "@/components/shared/ProgressBar"
import { AlertTriangle, BookOpen, TrendingDown, TrendingUp } from "lucide-react"
import { companyPath } from "@/lib/company/routes"
import { getHrProgressSnapshot } from "@/lib/dashboard-cache"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import Link from "next/link"
import { redirect } from "next/navigation"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CompanyProgressPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const companyId = session.user.empresa_id
  const query = await searchParams
  const selectedDepartment = readSearchParam(query, "departamento") ?? ""

  const snapshot = await getHrProgressSnapshot(companyId, selectedDepartment)
  if (!snapshot) redirect("/login")

  const {
    companySlug,
    courseSummaries,
    departmentSummaries,
    departmentOptions,
    thumbnails,
    learningActivityData,
    changeVsPreviousWeek,
    daysUntilExpiration,
  } = snapshot

  const thumbnailMap = new Map<number, string>(thumbnails)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progreso"
        description="Avance general y actividad de los cursos asignados"
      />

      {daysUntilExpiration !== null ? (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            daysUntilExpiration < 15
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : daysUntilExpiration < 30
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-portal-blue-soft bg-portal-blue-soft text-portal-blue-hover"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <p>
            {daysUntilExpiration >= 0
              ? `Quedan ${daysUntilExpiration} día${daysUntilExpiration !== 1 ? "s" : ""} para que venza tu paquete contratado.`
              : `Tu paquete contratado venció hace ${Math.abs(daysUntilExpiration)} día${Math.abs(daysUntilExpiration) !== 1 ? "s" : ""}.`}
          </p>
        </div>
      ) : null}

      <section className="rounded-lg bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">
            Resumen por curso
            <span className="ml-2 text-sm font-normal text-slate-400">
              {courseSummaries.length}
            </span>
          </h2>
          {departmentOptions.length > 0 ? (
            <CourseDepartmentFilter
              departments={departmentOptions}
              selected={selectedDepartment}
              basePath={companyPath(companySlug, "/progress")}
            />
          ) : null}
        </div>

        {courseSummaries.length === 0 ? (
          <EmptyState
            message={
              selectedDepartment
                ? `Sin progreso registrado para "${selectedDepartment}".`
                : "Aún no hay cursos sincronizados."
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {courseSummaries.map((course) => {
              const thumb = thumbnailMap.get(course.courseId)
              return (
                <Link
                  key={course.courseId}
                  href={companyPath(companySlug, `/progress/${course.courseId}`)}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#efefef] bg-white transition hover:border-portal-blue/30 hover:shadow-md"
                >
                  <div className="relative h-36 w-full shrink-0">
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-portal-blue-soft text-portal-blue">
                        <BookOpen size={40} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-800">
                        {course.nombre}
                      </p>
                      <span className="shrink-0 text-sm font-bold text-slate-950">
                        {course.averageProgress}%
                      </span>
                    </div>
                    <ProgressBar
                      value={course.averageProgress}
                      trackClassName="bg-slate-200"
                      fillClassName="bg-portal-blue"
                    />
                    <p className="text-xs font-medium text-slate-400">
                      {course.assigned} asignado{course.assigned !== 1 ? "s" : ""} ·{" "}
                      {course.completed} completado{course.completed !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpandableChartCard
          title="Finalizaciones de cursos por día"
          extra={
            changeVsPreviousWeek !== null ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  changeVsPreviousWeek >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {changeVsPreviousWeek >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {changeVsPreviousWeek >= 0 ? "+" : ""}
                {changeVsPreviousWeek}% vs semana previa
              </span>
            ) : null
          }
          compactChart={<LearningActivityChart data={learningActivityData} height={224} />}
          expandedChart={<LearningActivityChart data={learningActivityData} height={420} />}
        />

        <ExpandableChartCard
          title={
            <>
              Avance por departamento
              <span className="ml-2 text-sm font-normal text-slate-400">
                {departmentSummaries.length}
              </span>
            </>
          }
          compactChart={
            departmentSummaries.length === 0 ? (
              <EmptyState message="Aún no hay progreso registrado por departamento." />
            ) : (
              <DepartmentProgressChart data={departmentSummaries} height={256} />
            )
          }
          expandedChart={
            departmentSummaries.length === 0 ? (
              <EmptyState message="Aún no hay progreso registrado por departamento." />
            ) : (
              <DepartmentProgressChart data={departmentSummaries} height={420} />
            )
          }
        />
      </div>
    </div>
  )
}
