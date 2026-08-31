import { FileQuestion } from "lucide-react"
import { BackButton } from "@/components/shared/BackButton"
import EmptyState from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { PaginatedTable } from "@/components/shared/PaginatedTable"
import ProgressBar from "@/components/shared/ProgressBar"
import StatusBadge from "@/components/shared/StatusBadge"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { companyPath } from "@/lib/company/routes"
import { formatDate, formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { QUIZ_RESULT_LABEL, QUIZ_RESULT_VARIANT } from "@/lib/quiz-result"
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

const TABLE_PAGE_SIZE = 5

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

  const latestQuizAttemptByCourse = new Map<number, (typeof employee.quizAttempts)[number]>()
  for (const attempt of employee.quizAttempts) {
    const current = latestQuizAttemptByCourse.get(attempt.wp_course_id)
    const attemptTime = attempt.attempt_started_at?.getTime() ?? -Infinity
    const currentTime = current?.attempt_started_at?.getTime() ?? -Infinity
    if (!current || attemptTime > currentTime) {
      latestQuizAttemptByCourse.set(attempt.wp_course_id, attempt)
    }
  }
  const latestQuizAttempts = [...latestQuizAttemptByCourse.values()].sort((a, b) => {
    const aTime = a.attempt_started_at?.getTime() ?? -Infinity
    const bTime = b.attempt_started_at?.getTime() ?? -Infinity
    return bTime - aTime
  })

  const employeeName = `${employee.first_name} ${employee.last_name}`.trim()

  return (
    <div className="space-y-6">
      <BackButton href={companyPath(slug, "/employees")} label="Empleados" />

      <PageHeader
        title={employeeName}
        description={employee.email}
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

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-950">
          Progreso por curso
          <span className="ml-2 text-sm font-normal text-slate-400">{totalCourses}</span>
        </h2>

        {totalCourses === 0 ? (
          <EmptyState message="Este empleado aún no tiene cursos asignados." />
        ) : (
          <div className="space-y-2">
            {employee.courses.map((course) => (
              <div key={course.id} className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">{course.course_name}</p>
                  <StatusLabel
                    status={course.access_status}
                    variantMap={ACCESS_STATUS_VARIANT}
                    labelMap={ACCESS_STATUS_LABEL}
                  />
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <ProgressBar
                    value={course.progress_pct}
                    className="flex-1 border border-slate-300"
                  />
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
          Resultados del examen final
          {/* <span className="ml-2 text-sm font-normal text-slate-400">
            {latestQuizAttempts.length}
          </span> */}
        </h2>

        {latestQuizAttempts.length === 0 ? (
          <EmptyState
            icon={<FileQuestion size={28} className="text-slate-300" />}
            message="Sin intentos registrados"
            description="Este empleado aún no ha presentado ningún examen en sus cursos asignados."
          />
        ) : (
          <PaginatedTable
            ariaLabel="Intentos de examen"
            pageSize={TABLE_PAGE_SIZE}
            columns={[
              { label: "Examen" },
              { label: "Resultado" },
              { label: "Puntaje" },
              { label: "Preguntas", className: "hidden md:table-cell" },
              { label: "Tiempo", className: "hidden md:table-cell" },
              { label: "Fecha" },
            ]}
            rows={latestQuizAttempts.map((attempt) => {
              const scorePct = attempt.total_marks
                ? Math.round((attempt.earned_marks / attempt.total_marks) * 100)
                : 0
              const duration = formatQuizDuration(
                attempt.attempt_started_at,
                attempt.attempt_ended_at,
              )

              return (
                <tr key={attempt.id} className="bg-gray-50">
                  <td className="min-w-0 rounded-l-lg py-3 pl-4">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {attempt.quiz_name ?? "Examen"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {attempt.result ? (
                      <StatusLabel
                        status={attempt.result}
                        variantMap={QUIZ_RESULT_VARIANT}
                        labelMap={QUIZ_RESULT_LABEL}
                      />
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {attempt.earned_marks}/{attempt.total_marks} ({scorePct}%)
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                    {attempt.total_answered_questions}/{attempt.total_questions}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                    {duration ?? "—"}
                  </td>
                  <td className="rounded-r-lg px-4 py-3 text-sm text-slate-700">
                    {attempt.attempt_started_at ? formatDate(attempt.attempt_started_at) : "—"}
                  </td>
                </tr>
              )
            })}
          />
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
          <EmptyState message="Aún no se han emitido constancias para este empleado." />
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
    </div>
  )
}
