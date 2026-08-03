import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { ZipDownloadButton } from "@/components/company/ZipDownloadButton"
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import { Award, Clock, Users } from "lucide-react"
import { formatDateTime, getInitials } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { paginate } from "@/lib/pagination"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { companyPath } from "@/lib/company-routes"

type CompanyEmployee = {
  id: number
  first_name: string
  last_name: string
  email: string
  certificates: PortalCertificateRecord[]
  courses: PortalCourseRecord[]
}
type EmployeeCourse = PortalCourseRecord
type CompanyCertificate = PortalCertificateRecord & {
  employeeName: string
  employeeEmail: string
}
type PendingCertificate = {
  id: string
  employeeName: string
  employeeEmail: string
  courseName: string
  completedAt: Date | null
}

async function getCompanyCertificatesRecord(companyId: number) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: {
      employees: {
        where: { active: true },
        include: {
          certificates: {
            orderBy: [{ issued_at: "desc" }, { course_name: "asc" }],
          },
          courses: {
            orderBy: [{ completed: "desc" }, { completed_at: "desc" }],
          },
        },
        orderBy: { first_name: "asc" },
      },
    },
  })
}


type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const CERTIFICATES_PAGE_SIZE = 20

export default async function CompanyCertificatesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const company = await getCompanyCertificatesRecord(session.user.empresa_id)
  if (!company) redirect("/login")

  const params = await searchParams
  const issuedQuery = (readSearchParam(params, "q") ?? "").trim().toLowerCase()
  const issuedPage = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))
  const pendingQuery = (readSearchParam(params, "pq") ?? "").trim().toLowerCase()
  const pendingPage = Math.max(1, Number(readSearchParam(params, "ppage") ?? "1"))

  const certificates: CompanyCertificate[] = company.employees.flatMap(
    (employee: CompanyEmployee) =>
      employee.certificates.map((certificate: PortalCertificateRecord) => ({
        ...certificate,
        employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
        employeeEmail: employee.email,
      }))
  )

  const pendingCertificates: PendingCertificate[] = company.employees.flatMap(
    (employee: CompanyEmployee) => {
      const existingCourseIds = new Set(
        employee.certificates.map((c: PortalCertificateRecord) => c.wp_course_id)
      )
      return employee.courses
        .filter(
          (course: EmployeeCourse) =>
            course.completed && !existingCourseIds.has(course.wp_course_id)
        )
        .map((course: EmployeeCourse) => ({
          id: `${employee.id}-${course.wp_course_id}`,
          employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
          employeeEmail: employee.email,
          courseName: course.course_name,
          completedAt: course.completed_at,
        }))
    }
  )

  const filteredCertificates = issuedQuery
    ? certificates.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(issuedQuery) ||
          c.course_name.toLowerCase().includes(issuedQuery)
      )
    : certificates
  const {
    items: pagedCertificates,
    currentPage: issuedCurrentPage,
    totalPages: issuedTotalPages,
  } = paginate(filteredCertificates, issuedPage, CERTIFICATES_PAGE_SIZE)

  const filteredPending = pendingQuery
    ? pendingCertificates.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(pendingQuery) ||
          c.courseName.toLowerCase().includes(pendingQuery)
      )
    : pendingCertificates
  const {
    items: pagedPending,
    currentPage: pendingCurrentPage,
    totalPages: pendingTotalPages,
  } = paginate(filteredPending, pendingPage, CERTIFICATES_PAGE_SIZE)

  function issuedPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (issuedQuery) qs.set("q", issuedQuery)
    if (p > 1) qs.set("page", String(p))
    const str = qs.toString()
    return str ? `?${str}` : "?"
  }

  function pendingPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (pendingQuery) qs.set("pq", pendingQuery)
    if (p > 1) qs.set("ppage", String(p))
    const str = qs.toString()
    return str ? `?${str}` : "?"
  }

  const employeesWithCertificates = new Set(
    certificates.map((c: CompanyCertificate) => c.employeeEmail)
  ).size

  return (
    <div className="space-y-6">
      <PageHeader
        title="Constancias DC-3"
        description="Constancias de habilidades laborales para cumplimiento STPS"
        breadcrumbs={[{ label: "Empresa", href: companyPath(company.slug, "/home") }, { label: "Constancias DC-3" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Constancias emitidas" value={String(certificates.length)} sub="Total registradas" icon={Award} borderColor="orange" />
        <KpiCard label="Empleados con constancia" value={String(employeesWithCertificates)} sub="Al menos una emitida" icon={Users} borderColor="charcoal" />
        <KpiCard label="Pendientes" value={String(pendingCertificates.length)} sub="Cursos sin constancia aún" icon={Clock} borderColor="amber" />
      </div>

      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              Constancias emitidas
              <span className="ml-2 text-sm font-normal text-[#94a3b8]">
                {issuedQuery ? `${filteredCertificates.length} de ${certificates.length}` : certificates.length}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {certificates.length > 0 ? (
                <form className="flex gap-2">
                  <SearchInput name="q" defaultValue={issuedQuery} placeholder="Buscar empleado o curso..." width={200} />
                </form>
              ) : null}
              {certificates.length > 0 ? (
                <ZipDownloadButton count={certificates.length} />
              ) : null}
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
              Aún no hay constancias emitidas para los empleados activos.
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
              Sin resultados para &quot;{issuedQuery}&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {pagedCertificates.map((certificate: CompanyCertificate) => {
                const initials = getInitials(certificate.employeeName)
                return (
                  <div
                    key={certificate.id}
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FE] text-xs font-bold text-[#3579F5]">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                        {certificate.course_name}
                      </p>
                      <p className="truncate text-xs text-[#64748b]">
                        {certificate.employeeName} · Folio:{" "}
                        <span className="font-mono">{certificate.reference_number}</span>
                      </p>
                    </div>
                    <p className="hidden shrink-0 text-xs text-[#94a3b8] sm:block">
                      {formatDateTime(certificate.issued_at)}
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      {certificate.certificate_url ? (
                        <a
                          href={certificate.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#111827] transition-all duration-200 hover:bg-gray-200"
                        >
                          Ver Diploma
                        </a>
                      ) : null}
                      <a
                        href={`/api/certificates/${certificate.id}/dc3`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#3579F5] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2A61D6]"
                      >
                        DC-3
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Pagination
            currentPage={issuedCurrentPage}
            totalPages={issuedTotalPages}
            totalResults={filteredCertificates.length}
            buildPageUrl={issuedPageUrl}
          />
        </section>

        <section className="rounded-lg bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              Pendientes por aparecer
              <span className="ml-2 text-sm font-normal text-[#94a3b8]">
                {pendingQuery ? `${filteredPending.length} de ${pendingCertificates.length}` : pendingCertificates.length}
              </span>
            </h2>
            {pendingCertificates.length > 0 ? (
              <form className="flex gap-2">
                <SearchInput name="pq" defaultValue={pendingQuery} placeholder="Buscar empleado o curso..." width={200} />
              </form>
            ) : null}
          </div>

          {pendingCertificates.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-5 text-center text-sm text-gray-400">
              Todo lo emitido ya está reflejado. No hay pendientes.
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-5 text-center text-sm text-gray-400">
              Sin resultados para &quot;{pendingQuery}&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {pagedPending.map((item: PendingCertificate) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-700">
                    {getInitials(item.employeeName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-amber-950">
                      {item.courseName}
                    </p>
                    <p className="truncate text-xs text-amber-700">
                      {item.employeeName}
                      {item.completedAt
                        ? ` · Completado: ${formatDateTime(item.completedAt)}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    Pendiente
                  </span>
                </div>
              ))}
            </div>
          )}
          <Pagination
            currentPage={pendingCurrentPage}
            totalPages={pendingTotalPages}
            totalResults={filteredPending.length}
            buildPageUrl={pendingPageUrl}
          />
        </section>
      </div>
    </div>
  )
}
