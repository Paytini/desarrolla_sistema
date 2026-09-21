import CertificateActionsMenu from "@/components/company/CertificateActionsMenu"
import { PageHeader } from "@/components/shared/PageHeader"
import { ZipDownloadButton } from "@/components/company/ZipDownloadButton"
import { ListFilters } from "@/components/shared/ListFilters"
import { Pagination } from "@/components/shared/Pagination"
import EmptyState from "@/components/shared/EmptyState"
import { DataTable } from "@/components/shared/DataTable"
import { formatDateTime, getInitials } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import {
  buildIssuedCertificates,
  buildPendingCertificates,
  filterIssuedCertificates,
  filterPendingCertificates,
  getCompanyCertificatesRecord,
  getDistinctCourseNames,
  getDistinctDepartments,
  type IssuedCertificate,
  type PendingCertificate,
} from "@/lib/certificates"
import { paginate } from "@/lib/pagination"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

type CompanyEmployee = {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string | null
  certificates: PortalCertificateRecord[]
  courses: PortalCourseRecord[]
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const CERTIFICATES_PAGE_SIZE = 20

export default async function CompanyCertificatesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const company = await getCompanyCertificatesRecord(session.user.empresa_id)
  if (!company) redirect("/login")

  const employees = company.employees as CompanyEmployee[]

  const params = await searchParams
  const issuedQuery = readSearchParam(params, "q") ?? ""
  const issuedDept = readSearchParam(params, "dept") ?? ""
  const issuedCourse = readSearchParam(params, "course") ?? ""
  const issuedPage = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))
  const pendingQuery = readSearchParam(params, "pq") ?? ""
  const pendingDept = readSearchParam(params, "pdept") ?? ""
  const pendingPage = Math.max(1, Number(readSearchParam(params, "ppage") ?? "1"))

  const nonDc3Courses = await prisma.courseDc3Metadata.findMany({
    where: { grants_dc3: false },
    select: { wp_course_id: true },
  })
  const excludedCourseIds = new Set(nonDc3Courses.map((c) => c.wp_course_id))

  const certificates: IssuedCertificate[] = buildIssuedCertificates(employees)
  const pendingCertificates: PendingCertificate[] = buildPendingCertificates(
    employees,
    excludedCourseIds,
  )

  const departments = getDistinctDepartments(employees)
  const courseNames = getDistinctCourseNames(certificates)

  const filteredCertificates = filterIssuedCertificates(certificates, {
    q: issuedQuery,
    department: issuedDept,
    course: issuedCourse,
  })
  const {
    items: pagedCertificates,
    currentPage: issuedCurrentPage,
    totalPages: issuedTotalPages,
  } = paginate(filteredCertificates, issuedPage, CERTIFICATES_PAGE_SIZE)

  const filteredPending = filterPendingCertificates(pendingCertificates, {
    q: pendingQuery,
    department: pendingDept,
  })
  const {
    items: pagedPending,
    currentPage: pendingCurrentPage,
    totalPages: pendingTotalPages,
  } = paginate(filteredPending, pendingPage, CERTIFICATES_PAGE_SIZE)

  const issuedHasFilters = Boolean(issuedQuery || issuedDept || issuedCourse)
  const pendingHasFilters = Boolean(pendingQuery || pendingDept)

  function issuedPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (issuedQuery) qs.set("q", issuedQuery)
    if (issuedDept) qs.set("dept", issuedDept)
    if (issuedCourse) qs.set("course", issuedCourse)
    if (p > 1) qs.set("page", String(p))
    const str = qs.toString()
    return str ? `?${str}` : "?"
  }

  function pendingPageUrl(p: number) {
    const qs = new URLSearchParams()
    if (pendingQuery) qs.set("pq", pendingQuery)
    if (pendingDept) qs.set("pdept", pendingDept)
    if (p > 1) qs.set("ppage", String(p))
    const str = qs.toString()
    return str ? `?${str}` : "?"
  }

  const zipQueryString = issuedHasFilters
    ? `?${new URLSearchParams({
        ...(issuedQuery ? { q: issuedQuery } : {}),
        ...(issuedDept ? { dept: issuedDept } : {}),
        ...(issuedCourse ? { course: issuedCourse } : {}),
      }).toString()}`
    : ""

  return (
    <div className="space-y-6">
      <PageHeader
        title="Constancias DC-3"
        description="Constancias de habilidades laborales para cumplimiento STPS"
      />

      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-portal-ink">Constancias emitidas</h2>
            {certificates.length > 0 ? (
              <ZipDownloadButton
                count={certificates.length}
                filteredCount={filteredCertificates.length}
                queryString={zipQueryString}
              />
            ) : null}
          </div>

          {certificates.length > 0 ? (
            <div className="mb-4">
              <ListFilters
                searchPlaceholder="Buscar empleado o curso..."
                initialQuery={issuedQuery}
                extraQuery={pendingPageUrl(pendingPage)}
                selects={[
                  {
                    name: "dept",
                    defaultValue: "",
                    initialValue: issuedDept,
                    ariaLabel: "Filtrar por departamento",
                    options: [
                      { value: "", label: "Todos los departamentos" },
                      ...departments.map((d) => ({ value: d, label: d })),
                    ],
                  },
                  {
                    name: "course",
                    defaultValue: "",
                    initialValue: issuedCourse,
                    ariaLabel: "Filtrar por curso",
                    options: [
                      { value: "", label: "Todos los cursos" },
                      ...courseNames.map((c) => ({ value: c, label: c })),
                    ],
                  },
                ]}
              />
            </div>
          ) : null}

          <DataTable
            ariaLabel="Constancias emitidas"
            headerClassName="bg-slate-50 pt-2 first:rounded-l-lg last:rounded-r-lg text-sm font-normal normal-case tracking-normal text-slate-700"
            columns={[
              { label: "SL" },
              { label: "Empleado" },
              { label: "Departamento" },
              { label: "Curso" },
              { label: "Emitido", className: "hidden sm:table-cell" },
              { label: "Acciones" },
            ]}
            rows={pagedCertificates.map((certificate, index) => (
              <tr
                key={certificate.id}
                className={
                  index % 2 === 0
                    ? "bg-white transition-colors hover:bg-slate-100"
                    : "bg-slate-50 transition-colors hover:bg-slate-100"
                }
              >
                <td className="rounded-l-lg px-3 py-3 text-sm text-slate-400">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-3 py-3">
                  <span className="min-w-0 truncate text-base font-medium text-portal-ink">
                    {certificate.employeeName}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-500">
                  {certificate.department ?? "—"}
                </td>
                <td
                  className="max-w-[480px] truncate px-3 py-3 text-sm text-portal-ink"
                  title={certificate.course_name}
                >
                  {certificate.course_name}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-slate-400 sm:table-cell">
                  {formatDateTime(certificate.issued_at)}
                </td>
                <td className="rounded-r-lg whitespace-nowrap px-7 py-3">
                  <CertificateActionsMenu
                    courseName={certificate.course_name}
                    certificateUrl={certificate.certificate_url}
                    dc3Url={
                      excludedCourseIds.has(certificate.wp_course_id)
                        ? null
                        : `/api/certificates/${certificate.id}/dc3`
                    }
                  />
                </td>
              </tr>
            ))}
            emptyState={{
              message:
                certificates.length === 0
                  ? "Aún no hay constancias emitidas para los empleados activos."
                  : "Sin resultados para estos filtros.",
            }}
          />
          <Pagination
            currentPage={issuedCurrentPage}
            totalPages={issuedTotalPages}
            totalResults={filteredCertificates.length}
            buildPageUrl={issuedPageUrl}
            variant="numbered"
          />
        </section>

        <section className="rounded-lg bg-white p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-portal-ink">
              Pendientes por aparecer
              <span className="ml-2 text-sm font-normal text-slate-400">
                {pendingHasFilters
                  ? `${filteredPending.length} de ${pendingCertificates.length}`
                  : pendingCertificates.length}
              </span>
            </h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Cursos que el empleado ya completó pero cuya constancia aún no ha sido generada o
            sincronizada.
          </p>

          {pendingCertificates.length > 0 ? (
            <div className="mb-4">
              <ListFilters
                searchParamName="pq"
                searchPlaceholder="Buscar empleado o curso..."
                initialQuery={pendingQuery}
                extraQuery={issuedPageUrl(issuedPage)}
                selects={[
                  {
                    name: "pdept",
                    defaultValue: "",
                    initialValue: pendingDept,
                    ariaLabel: "Filtrar por departamento",
                    options: [
                      { value: "", label: "Todos los departamentos" },
                      ...departments.map((d) => ({ value: d, label: d })),
                    ],
                  },
                ]}
              />
            </div>
          ) : null}

          {pendingCertificates.length === 0 ? (
            <EmptyState message="Todo lo emitido ya está reflejado. No hay pendientes." />
          ) : filteredPending.length === 0 ? (
            <EmptyState message="Sin resultados para estos filtros." />
          ) : (
            <div className="space-y-2">
              {pagedPending.map((item) => (
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
                      {item.department ? ` · ${item.department}` : ""}
                      {item.completedAt ? ` · Completado: ${formatDateTime(item.completedAt)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination
            currentPage={pendingCurrentPage}
            totalPages={pendingTotalPages}
            totalResults={filteredPending.length}
            buildPageUrl={pendingPageUrl}
            variant="numbered"
          />
        </section>
      </div>
    </div>
  )
}
