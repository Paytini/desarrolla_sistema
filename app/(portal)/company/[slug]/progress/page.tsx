import KpiCard from "@/components/shared/KpiCard"
import {
  LearningActivityChart,
  type LearningActivityPoint,
} from "@/components/company/LearningActivityChart"
import { PageHeader } from "@/components/shared/PageHeader"
import ProgressBar from "@/components/shared/ProgressBar"
import { BarChart3, BookOpen, CheckCircle } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getLastSevenDayKeys(): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today)
    day.setUTCDate(day.getUTCDate() - i)
    days.push({ key: toDateKey(day), label: WEEKDAY_LABELS[day.getUTCDay()] })
  }
  return days
}

async function getWeeklyLearningActivity(companyId: string) {
  const weekDays = getLastSevenDayKeys()
  const currentWeekStart = new Date(`${weekDays[0].key}T00:00:00.000Z`)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)

  const [currentWeekCertificates, previousWeekCount] = await Promise.all([
    prisma.certificate.findMany({
      where: { employee: { company_id: companyId }, issued_at: { gte: currentWeekStart } },
      select: { issued_at: true },
    }),
    prisma.certificate.count({
      where: {
        employee: { company_id: companyId },
        issued_at: { gte: previousWeekStart, lt: currentWeekStart },
      },
    }),
  ])

  const countsByDay = new Map(weekDays.map((day) => [day.key, 0]))
  for (const certificate of currentWeekCertificates) {
    const key = toDateKey(certificate.issued_at)
    if (countsByDay.has(key)) countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1)
  }

  const data: LearningActivityPoint[] = weekDays.map((day) => ({
    label: day.label,
    completions: countsByDay.get(day.key) ?? 0,
  }))

  const currentWeekTotal = currentWeekCertificates.length
  const changeVsPreviousWeek =
    previousWeekCount > 0
      ? Math.round(((currentWeekTotal - previousWeekCount) / previousWeekCount) * 100)
      : currentWeekTotal > 0
        ? 100
        : null

  return { data, changeVsPreviousWeek }
}

export default async function CompanyProgressPage() {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const companyId = session.user.empresa_id

  const [
    company,
    { data: learningActivityData, changeVsPreviousWeek },
    activeCompanyPackage,
    courseAgg,
    completedCourses,
    startedCourses,
    assignedByCourse,
    completedByCourse,
    inProgressByCourse,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, slug: true },
    }),
    getWeeklyLearningActivity(companyId),
    prisma.companyPackage.findFirst({
      where: { company_id: companyId, active: true },
      orderBy: { created_at: "desc" },
      select: {
        package: { select: { courses: { select: { wp_course_id: true, cover_url: true } } } },
      },
    }),
    prisma.employeeCourse.aggregate({
      where: { employee: { company_id: companyId, active: true } },
      _avg: { progress_pct: true },
    }),
    prisma.employeeCourse.count({
      where: { employee: { company_id: companyId, active: true }, completed: true },
    }),
    prisma.employeeCourse.count({
      where: { employee: { company_id: companyId, active: true }, progress_pct: { gt: 0 } },
    }),
    prisma.employeeCourse.groupBy({
      by: ["wp_course_id"],
      where: { employee: { company_id: companyId, active: true } },
      _count: { _all: true },
      _avg: { progress_pct: true },
      _max: { course_name: true },
    }),
    prisma.employeeCourse.groupBy({
      by: ["wp_course_id"],
      where: { employee: { company_id: companyId, active: true }, completed: true },
      _count: { _all: true },
    }),
    prisma.employeeCourse.groupBy({
      by: ["wp_course_id"],
      where: {
        employee: { company_id: companyId, active: true },
        completed: false,
        progress_pct: { gt: 0 },
      },
      _count: { _all: true },
    }),
  ])

  if (!company) redirect("/login")

  const packageCourses = activeCompanyPackage?.package?.courses ?? []
  const thumbnailMap = new Map<number, string>(
    packageCourses.filter((c) => c.cover_url).map((c) => [c.wp_course_id, c.cover_url as string]),
  )

  const averageProgress = Math.round(courseAgg._avg.progress_pct ?? 0)

  const completedByCourseMap = new Map(
    completedByCourse.map((r) => [r.wp_course_id, r._count._all]),
  )
  const inProgressByCourseMap = new Map(
    inProgressByCourse.map((r) => [r.wp_course_id, r._count._all]),
  )

  const courseSummaries = assignedByCourse
    .map((row) => {
      const assigned = row._count._all
      const completed = completedByCourseMap.get(row.wp_course_id) ?? 0
      const inProgress = inProgressByCourseMap.get(row.wp_course_id) ?? 0
      return {
        courseId: row.wp_course_id,
        nombre: row._max.course_name ?? "",
        assigned,
        completed,
        inProgress,
        notStarted: assigned - completed - inProgress,
        averageProgress: Math.round(row._avg.progress_pct ?? 0),
      }
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return b.completed - a.completed
      return a.nombre.localeCompare(b.nombre, "es-MX")
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progreso"
        description="Avance general y actividad de los cursos asignados"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Avance promedio"
          value={`${averageProgress}%`}
          sub="Todos los cursos"
          icon={BarChart3}
          borderColor="orange"
        />
        <KpiCard
          label="Cursos iniciados"
          value={String(startedCourses)}
          sub="Con actividad real"
          icon={BookOpen}
          borderColor="charcoal"
        />
        <KpiCard
          label="Cursos completados"
          value={String(completedCourses)}
          sub="Cerrados por empleados"
          icon={CheckCircle}
          borderColor="emerald"
        />
      </div>

      <LearningActivityChart
        data={learningActivityData}
        changeVsPreviousWeek={changeVsPreviousWeek}
      />

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
                    <div className="flex h-[56px] items-center justify-center bg-portal-blue-soft">
                      <span className="text-xl font-bold text-portal-blue/20">
                        {course.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-slate-950">
                        {course.nombre}
                      </p>
                      <span className="shrink-0 text-sm font-bold text-slate-950">
                        {course.averageProgress}%
                      </span>
                    </div>
                    <ProgressBar
                      value={course.averageProgress}
                      className="mb-2"
                      trackClassName="bg-slate-200"
                      fillClassName="bg-portal-blue"
                    />
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>{course.assigned} asignados</span>
                      <span className="text-portal-blue">{course.completed} completados</span>
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
  )
}
