import { BookOpen, Send } from "lucide-react"
import { BackButton } from "@/components/shared/BackButton"
import { CourseEmployeeTable } from "@/components/company/CourseEmployeeTable"
import { InfoField } from "@/components/shared/InfoField"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusToast from "@/components/shared/StatusToast"
import { SubmitButton } from "@/components/shared/SubmitButton"
import { companyPath } from "@/lib/company/routes"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { readSearchParam } from "@/lib/search-params"
import { redirect } from "next/navigation"
import { sendCourseReminderAction } from "../actions"

type PageProps = {
  params: Promise<{ slug: string; courseId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CourseProgressPage({ params, searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const { slug, courseId: courseIdRaw } = await params
  const query = await searchParams
  const companyId = session.user.empresa_id
  const courseId = Number.parseInt(courseIdRaw, 10)

  if (!Number.isInteger(courseId) || courseId <= 0) {
    redirect(companyPath(slug, "/progress"))
  }

  const [activeCompanyPackage, employeeCourses, dc3Metadata, quizAttempts] = await Promise.all([
    prisma.companyPackage.findFirst({
      where: { company_id: companyId, active: true },
      orderBy: { created_at: "desc" },
      select: {
        package: {
          select: { courses: { select: { wp_course_id: true, course_name: true, cover_url: true } } },
        },
      },
    }),
    prisma.employeeCourse.findMany({
      where: { wp_course_id: courseId, employee: { company_id: companyId, active: true } },
      include: {
        employee: {
          select: { id: true, first_name: true, last_name: true, department: true, position: true },
        },
      },
      orderBy: [{ progress_pct: "desc" }],
    }),
    prisma.courseDc3Metadata.findUnique({ where: { wp_course_id: courseId } }),
    prisma.quizAttempt.findMany({
      where: { wp_course_id: courseId, employee: { company_id: companyId, active: true } },
      orderBy: { attempt_started_at: "desc" },
      select: { employee_id: true, earned_marks: true, total_marks: true },
    }),
  ])

  const quizScorePctByEmployeeId = new Map<string, number | null>()
  for (const attempt of quizAttempts) {
    if (!quizScorePctByEmployeeId.has(attempt.employee_id)) {
      const scorePct = attempt.total_marks
        ? Math.round((attempt.earned_marks / attempt.total_marks) * 100)
        : null
      quizScorePctByEmployeeId.set(attempt.employee_id, scorePct)
    }
  }

  const catalogCourse = (activeCompanyPackage?.package?.courses ?? []).find(
    (course) => course.wp_course_id === courseId,
  )

  if (!catalogCourse && employeeCourses.length === 0) {
    redirect(companyPath(slug, "/progress"))
  }

  const courseName = catalogCourse?.course_name ?? employeeCourses[0]?.course_name ?? "Curso"
  const coverUrl = catalogCourse?.cover_url ?? null

  const assigned = employeeCourses.length
  const completed = employeeCourses.filter((row) => row.completed).length
  const pending = assigned - completed
  const averageProgress = assigned
    ? Math.round(employeeCourses.reduce((sum, row) => sum + row.progress_pct, 0) / assigned)
    : 0

  const tableRows = employeeCourses.map((row) => ({
    id: row.id,
    progressPct: row.progress_pct,
    completed: row.completed,
    lastSyncedAt: row.last_synced_at,
    quizScorePct: quizScorePctByEmployeeId.get(row.employee.id) ?? null,
    employee: {
      id: row.employee.id,
      firstName: row.employee.first_name,
      lastName: row.employee.last_name,
      department: row.employee.department,
      position: row.employee.position,
    },
  }))

  const reminderSent = readSearchParam(query, "recordatorio") === "ok"
  const reminderCount = readSearchParam(query, "count")

  return (
    <div className="space-y-6">
      <BackButton href={companyPath(slug, "/progress")} label="Progreso" />

      {reminderSent ? (
        <StatusToast
          tone="success"
          message={`Recordatorio enviado a ${reminderCount ?? 0} colaborador${reminderCount === "1" ? "" : "es"}.`}
        />
      ) : null}

      <PageHeader
        title={courseName}
        action={
          pending > 0 ? (
            <form action={sendCourseReminderAction}>
              <input type="hidden" name="curso_id" value={courseId} />
              <input type="hidden" name="curso_nombre" value={courseName} />
              <SubmitButton
                variant="outlined"
                startIcon={<Send size={14} />}
                sx={{ whiteSpace: "nowrap" }}
              >
                Enviar recordatorio ({pending})
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      <section className="rounded-lg bg-white p-6">
        <div className="grid items-start gap-6 md:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-lg">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={courseName} className="block w-full object-contain" />
            ) : (
              <div className="flex h-48 items-center justify-center bg-portal-blue-soft text-portal-blue md:min-h-[220px]">
                <BookOpen size={48} />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-5">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Progreso
              </p>
              <div className="grid grid-cols-3 gap-4">
                <InfoField label="Asignados" value={String(assigned)} />
                <InfoField label="Completados" value={String(completed)} />
                <InfoField label="Avance promedio" value={`${averageProgress}%`} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Información DC-3
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <InfoField
                  label="Duración"
                  value={dc3Metadata?.duration_hours ? `${dc3Metadata.duration_hours} h` : "—"}
                />
                <InfoField label="Área temática" value={dc3Metadata?.subject_area_name ?? "—"} />
                <InfoField
                  label="Agente capacitador"
                  value={dc3Metadata?.training_agent_name ?? "—"}
                />
                <InfoField label="Instructor" value={dc3Metadata?.instructor_name ?? "—"} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <CourseEmployeeTable rows={tableRows} slug={slug} />
    </div>
  )
}
