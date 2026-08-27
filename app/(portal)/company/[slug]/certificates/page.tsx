import { PageHeader } from "@/components/shared/PageHeader"
import { ZipDownloadButton } from "@/components/company/ZipDownloadButton"
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import EmptyState from "@/components/shared/EmptyState"
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

  const certificates: IssuedCertificate[] = buildIssuedCertificates(employees)
  const pendingCertificates: PendingCertificate[] = buildPendingCertificates(employees)

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

  const clearIssuedUrl = pendingPageUrl(pendingPage)
  const clearPendingUrl = issuedPageUrl(issuedPage)

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
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              Constancias emitidas
              <span className="ml-2 text-sm font-normal text-[#94a3b8]">
                {issuedHasFilters
                  ? `${filteredCertificates.length} de ${certificates.length}`
                  : certificates.length}
              </span>
            </h2>
            {certificates.length > 0 ? (
              <ZipDownloadButton
                count={certificates.length}
                filteredCount={filteredCertificates.length}
                queryString={zipQueryString}
              />
            ) : null}
          </div>

          {certificates.length > 0 ? (
            <form className="mb-4 flex flex-wrap items-center gap-2">
              <SearchInput
                name="q"
                defaultValue={issuedQuery}
                placeholder="Buscar empleado o curso..."
                width={220}
              />
              <select
                name="dept"
                defaultValue={issuedDept}
                aria-label="Filtrar por departamento"
                className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
              >
                <option value="">Todos los departamentos</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                name="course"
                defaultValue={issuedCourse}
                aria-label="Filtrar por curso"
                className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
              >
                <option value="">Todos los cursos</option>
                {courseNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-portal-border bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-gray-50"
              >
                Filtrar
              </button>
              {issuedHasFilters ? (
                <a
                  href={clearIssuedUrl}
                  className="rounded-lg border border-portal-border bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-gray-50"
                >
                  Limpiar
                </a>
              ) : null}
            </form>
          ) : null}

          {certificates.length === 0 ? (
            <EmptyState message="Aún no hay constancias emitidas para los empleados activos." />
          ) : filteredCertificates.length === 0 ? (
            <EmptyState message="Sin resultados para estos filtros." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    <th className="px-3 py-2 font-semibold">Empleado</th>
                    <th className="px-3 py-2 font-semibold">Departamento</th>
                    <th className="px-3 py-2 font-semibold">Curso</th>
                    <th className="px-3 py-2 font-semibold">Folio</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">Emitido</th>
                    <th className="px-3 py-2 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCertificates.map((certificate) => {
                    return (
                      <tr
                        key={certificate.id}
                        className="border-b border-[#f5f5f5] transition hover:bg-gray-50"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="min-w-0 truncate font-medium text-[#1a1a1a]">
                              {certificate.employeeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[#64748b]">
                          {certificate.department ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-[#1a1a1a]">{certificate.course_name}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[#64748b]">
                          {certificate.reference_number}
                        </td>
                        <td className="hidden px-3 py-3 text-xs text-[#94a3b8] sm:table-cell">
                          {formatDateTime(certificate.issued_at)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5">
                            {certificate.certificate_url ? (
                              <a
                                href={certificate.certificate_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#111827] transition hover:bg-gray-200"
                              >
                                Ver Diploma
                              </a>
                            ) : null}
                            <a
                              href={`/api/certificates/${certificate.id}/dc3`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl bg-portal-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-portal-blue-hover"
                            >
                              DC-3
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              Pendientes por aparecer
              <span className="ml-2 text-sm font-normal text-[#94a3b8]">
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
            <form className="mb-4 flex flex-wrap items-center gap-2">
              <SearchInput
                name="pq"
                defaultValue={pendingQuery}
                placeholder="Buscar empleado o curso..."
                width={220}
              />
              <select
                name="pdept"
                defaultValue={pendingDept}
                aria-label="Filtrar por departamento"
                className="rounded-lg border border-portal-border px-3 py-2 text-sm text-slate-600 outline-none"
              >
                <option value="">Todos los departamentos</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-portal-border bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-gray-50"
              >
                Filtrar
              </button>
              {pendingHasFilters ? (
                <a
                  href={clearPendingUrl}
                  className="rounded-lg border border-portal-border bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-gray-50"
                >
                  Limpiar
                </a>
              ) : null}
            </form>
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
          />
        </section>
      </div>
    </div>
  )
}
