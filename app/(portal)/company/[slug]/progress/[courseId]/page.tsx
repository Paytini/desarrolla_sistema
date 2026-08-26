import { BookOpen } from "lucide-react"
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
import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string; courseId: string }>
}

type RowStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "ERROR"

const ROW_STATUS_VARIANT: Record<RowStatus, "green" | "amber" | "red" | "slate"> = {
  COMPLETED: "green",
  IN_PROGRESS: "amber",
  NOT_STARTED: "slate",
  ERROR: "red",
}

const ROW_STATUS_LABEL: Record<RowStatus, string> = {
  COMPLETED: "Completado",
  IN_PROGRESS: "En curso",
  NOT_STARTED: "Sin iniciar",
  ERROR: "Error de acceso",
}

const TABLE_PAGE_SIZE = 10

export default async function CourseProgressPage({ params }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const { slug, courseId: courseIdRaw } = await params
  const companyId = session.user.empresa_id
  const courseId = Number.parseInt(courseIdRaw, 10)

  if (!Number.isInteger(courseId) || courseId <= 0) {
    redirect(companyPath(slug, "/progress"))
  }

  const [activeCompanyPackage, employeeCourses] = await Promise.all([
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
    if (row.access_status === "ERROR") return "ERROR"
    if (row.completed) return "COMPLETED"
    if (row.progress_pct > 0) return "IN_PROGRESS"
    return "NOT_STARTED"
  }

  return (
    <div className="space-y-6">
      <BackButton href={companyPath(slug, "/progress")} label="Progreso" />

      <PageHeader
        title={courseName}
        description={`${assigned} empleado${assigned !== 1 ? "s" : ""} asignado${assigned !== 1 ? "s" : ""} · ${completed} completado${completed !== 1 ? "s" : ""} · ${averageProgress}% de avance promedio`}
      />

      <section className="overflow-hidden rounded-lg bg-white">
        <div className="relative h-40 w-full shrink-0">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-portal-blue-soft text-portal-blue">
              <BookOpen size={48} />
            </div>
          )}
        </div>

        <div className="p-5">
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
                    <td className="rounded-r-lg px-4 py-3 text-sm text-slate-500">
                      {formatDateTime(row.last_synced_at)}
                    </td>
                  </tr>
                )
              })}
            />
          )}
        </div>
      </section>
    </div>
  )
}
