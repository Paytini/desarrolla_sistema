import { Award, BarChart3, BookOpen, CheckCircle, FileQuestion } from "lucide-react"
import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { companyPath } from "@/lib/company-routes"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string; employeeId: string }>
}

const ACCESS_STATUS_VARIANT: Record<string, "green" | "amber" | "red" | "slate"> = {
  ACTIVE: "green",
  PENDING: "amber",
  ERROR: "red",
  REQUIRES_REVIEW: "amber",
}

const ACCESS_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Con acceso",
  PENDING: "Pendiente",
  ERROR: "Error de acceso",
  REQUIRES_REVIEW: "Requiere revisión",
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm text-slate-800">{value}</p>
    </div>
  )
}

const QUIZ_RESULT_VARIANT: Record<string, "green" | "amber" | "red" | "slate"> = {
  pass: "green",
  fail: "red",
  pending: "amber",
}

const QUIZ_RESULT_LABEL: Record<string, string> = {
  pass: "Aprobado",
  fail: "No aprobado",
  pending: "Pendiente de revisión",
}

function formatQuizDuration(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt || !endedAt) return null
  const minutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
  if (minutes < 1) return "Menos de 1 min"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`
}

export default async function EmployeeProfilePage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const { slug, employeeId } = await params
  const companyId = session.user.empresa_id

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, company_id: companyId },
    include: {
      courses: { orderBy: [{ progress_pct: "desc" }, { course_name: "asc" }] },
      certificates: { orderBy: { issued_at: "desc" } },
      quizAttempts: { orderBy: { attempt_started_at: "desc" } },
    },
  })

  if (!employee) redirect(companyPath(slug, "/employees"))

  const totalCourses = employee.courses.length
  const completedCourses = employee.courses.filter((c) => c.completed).length
  const averageProgress = totalCourses
    ? Math.round(employee.courses.reduce((sum, c) => sum + c.progress_pct, 0) / totalCourses)
    : 0

  const employeeName = `${employee.first_name} ${employee.last_name}`.trim()

  return (
    <div className="space-y-6">
      <PageHeader
        title={employeeName}
        description={employee.email}
        breadcrumbs={[
          { label: "Empresa", href: companyPath(slug, "/home") },
          { label: "Empleados", href: companyPath(slug, "/employees") },
          { label: employeeName },
        ]}
        action={
          <StatusBadge variant={employee.active ? "green" : "slate"} dot>
            {employee.active ? "Activo" : "Suspendido"}
          </StatusBadge>
        }
      />

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-950">Información del empleado</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoField label="Correo" value={employee.email} />
          <InfoField label="Puesto" value={employee.position ?? "—"} />
          <InfoField label="Departamento" value={employee.department ?? "—"} />
          <InfoField label="CURP" value={employee.curp ?? "—"} />
          <InfoField label="Ocupación (CNO)" value={employee.occupation_name ?? "—"} />
          <InfoField label="Fecha de alta" value={formatDate(employee.created_at)} />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Avance promedio"
          value={`${averageProgress}%`}
          sub="Todos los cursos"
          icon={BarChart3}
          borderColor="orange"
        />
        <KpiCard
          label="Cursos asignados"
          value={String(totalCourses)}
          icon={BookOpen}
          borderColor="charcoal"
        />
        <KpiCard
          label="Cursos completados"
          value={String(completedCourses)}
          icon={CheckCircle}
          borderColor="emerald"
        />
        <KpiCard
          label="Constancias emitidas"
          value={String(employee.certificates.length)}
          icon={Award}
          borderColor="violet"
        />
      </div>

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-950">
          Progreso por curso
          <span className="ml-2 text-sm font-normal text-slate-400">{totalCourses}</span>
        </h2>

        {totalCourses === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Este empleado aún no tiene cursos asignados.
          </div>
        ) : (
          <div className="space-y-2">
            {employee.courses.map((course) => (
              <div key={course.id} className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">{course.course_name}</p>
                  <StatusBadge variant={ACCESS_STATUS_VARIANT[course.access_status] ?? "slate"} dot>
                    {ACCESS_STATUS_LABEL[course.access_status] ?? course.access_status}
                  </StatusBadge>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full border border-slate-300 bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        course.progress_pct >= 75
                          ? "bg-portal-blue"
                          : course.progress_pct > 0
                            ? "bg-amber-500"
                            : "bg-slate-300"
                      }`}
                      style={{ width: `${course.progress_pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
                    {course.progress_pct}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span>
                    Inicio: {course.course_start_date ? formatDate(course.course_start_date) : "—"}
                  </span>
                  <span>
                    Finalización: {course.completed_at ? formatDate(course.completed_at) : "—"}
                  </span>
                  <span>Última sincronización: {formatDateTime(course.last_synced_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-950">
          Constancias
          <span className="ml-2 text-sm font-normal text-slate-400">
            {employee.certificates.length}
          </span>
        </h2>

        {employee.certificates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aún no se han emitido constancias para este empleado.
          </div>
        ) : (
          <div className="space-y-2">
            {employee.certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {cert.course_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Folio {cert.reference_number} · Emitida {formatDate(cert.issued_at)}
                  </p>
                </div>
                <a
                  href={`/api/certificates/${cert.id}/dc3`}
                  className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                >
                  Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-950">
          Intentos de examen
          <span className="ml-2 text-sm font-normal text-slate-400">
            {employee.quizAttempts.length}
          </span>
        </h2>

        {employee.quizAttempts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <FileQuestion size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Sin intentos registrados</p>
            <p className="max-w-md text-xs text-slate-500">
              Este empleado aún no ha presentado ningún examen en sus cursos asignados.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {employee.quizAttempts.map((attempt) => {
              const scorePct = attempt.total_marks
                ? Math.round((attempt.earned_marks / attempt.total_marks) * 100)
                : 0
              const duration = formatQuizDuration(
                attempt.attempt_started_at,
                attempt.attempt_ended_at,
              )

              return (
                <div key={attempt.id} className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {attempt.quiz_name ?? "Examen"}
                    </p>
                    {attempt.result ? (
                      <StatusBadge variant={QUIZ_RESULT_VARIANT[attempt.result] ?? "slate"} dot>
                        {QUIZ_RESULT_LABEL[attempt.result] ?? attempt.result}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      Puntaje: {attempt.earned_marks}/{attempt.total_marks} ({scorePct}%)
                    </span>
                    <span>
                      Preguntas respondidas: {attempt.total_answered_questions}/
                      {attempt.total_questions}
                    </span>
                    {duration ? <span>Tiempo: {duration}</span> : null}
                    {attempt.attempt_started_at ? (
                      <span>Fecha: {formatDate(attempt.attempt_started_at)}</span>
                    ) : null}
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
