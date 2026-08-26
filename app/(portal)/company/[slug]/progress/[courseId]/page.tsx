import { BookOpen, Eye } from "lucide-react"
import Tooltip from "@mui/material/Tooltip"
import { BackButton } from "@/components/shared/BackButton"
import EmptyState from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { PaginatedTable } from "@/components/shared/PaginatedTable"
import ProgressBar from "@/components/shared/ProgressBar"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { companyPath } from "@/lib/company-routes"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import Link from "next/link"
import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string; courseId: string }>
}

type RowStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"

const ROW_STATUS_VARIANT: Record<RowStatus, "green" | "amber" | "slate"> = {
  COMPLETED: "green",
  IN_PROGRESS: "amber",
  NOT_STARTED: "slate",
}

const ROW_STATUS_LABEL: Record<RowStatus, string> = {
  COMPLETED: "Completado",
  IN_PROGRESS: "En curso",
  NOT_STARTED: "Sin iniciar",
}

const TABLE_PAGE_SIZE = 10

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm text-slate-800">{value}</p>
    </div>
  )
}

export default async function CourseProgressPage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const { slug, courseId: courseIdRaw } = await params
  const companyId = session.user.empresa_id
  const courseId = Number.parseInt(courseIdRaw, 10)

  if (!Number.isInteger(courseId) || courseId <= 0) {
    redirect(companyPath(slug, "/progress"))
  }

  const [activeCompanyPackage, employeeCourses, dc3Metadata] = await Promise.all([
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
  ])

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
  const averageProgress = assigned
    ? Math.round(employeeCourses.reduce((sum, row) => sum + row.progress_pct, 0) / assigned)
    : 0

  function rowStatus(row: (typeof employeeCourses)[number]): RowStatus {
    if (row.completed) return "COMPLETED"
    if (row.progress_pct > 0) return "IN_PROGRESS"
    return "NOT_STARTED"
  }

  return (
    <div className="space-y-6">
      <BackButton href={companyPath(slug, "/progress")} label="Progreso" />

      <PageHeader title={courseName} />

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

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-950">
          Progreso por empleado
          <span className="ml-2 text-sm font-normal text-slate-400">{assigned}</span>
        </h2>

        {employeeCourses.length === 0 ? (
          <EmptyState message="Aún no hay empleados asignados a este curso." />
        ) : (
          <PaginatedTable
            ariaLabel="Progreso por empleado"
            pageSize={TABLE_PAGE_SIZE}
            columns={[
              { label: "Empleado" },
              { label: "Departamento" },
              { label: "Puesto" },
              { label: "Avance" },
              { label: "Estado" },
              { label: "Última sincronización" },
              { label: "" },
            ]}
            rows={employeeCourses.map((row) => {
              const status = rowStatus(row)
              return (
                <tr key={row.id} className="bg-gray-50">
                  <td className="min-w-0 rounded-l-lg py-3 pl-4">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {row.employee.first_name} {row.employee.last_name}
                    </p>
                  </td>
                  <td className="truncate px-4 py-3 text-sm text-slate-500">
                    {row.employee.department ?? "—"}
                  </td>
                  <td className="truncate px-4 py-3 text-sm text-slate-500">
                    {row.employee.position ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={row.progress_pct} className="w-24" />
                      <span className="w-9 shrink-0 text-sm tabular-nums text-slate-700">
                        {row.progress_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusLabel
                      status={status}
                      variantMap={ROW_STATUS_VARIANT}
                      labelMap={ROW_STATUS_LABEL}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatDateTime(row.last_synced_at)}
                  </td>
                  <td className="rounded-r-lg py-3 pr-4 text-right">
                    <Tooltip title="Ver perfil">
                      <Link
                        href={companyPath(slug, `/employees/${row.employee.id}`)}
                        aria-label={`Ver perfil de ${row.employee.first_name} ${row.employee.last_name}`}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-500 transition hover:bg-gray-100 hover:text-slate-700"
                      >
                        <Eye size={18} strokeWidth={2} />
                      </Link>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          />
        )}
      </section>
    </div>
  )
}
