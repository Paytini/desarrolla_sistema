import type { ConsultingRequest } from "@prisma/client"
import { CalendarClock } from "lucide-react"
import { redirect } from "next/navigation"
import Stack from "@mui/material/Stack"
import { ConsultingFilters } from "@/components/superadmin/ConsultingFilters"
import { ConsultingRequestActions } from "@/components/superadmin/ConsultingRequestActions"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { CONSULTING_AREAS, getConsultingArea } from "@/lib/consulting-areas"
import { CONSULTING_CONTACT_METHOD_LABELS } from "@/lib/consulting-contact-method"
import { formatConsultingDateTime } from "@/lib/consulting-schedule"
import { CONSULTING_STATUS_LABEL, CONSULTING_STATUS_VARIANT } from "@/lib/consulting-status"
import { paginate } from "@/lib/pagination"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"

const successMessages: Record<string, string> = {
  solicitud_confirmada: "La solicitud fue confirmada.",
  solicitud_cancelada: "La solicitud fue cancelada.",
}

const errorMessages: Record<string, string> = {
  solicitud: "No se encontró la solicitud o ya no está pendiente.",
}

const PAGE_SIZE = 5

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type RequestWithCompany = ConsultingRequest & { company: { id: string; name: string } }

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default async function SuperAdminConsultingPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const selectedCompany = readSearchParam(params, "empresa") ?? ""
  const selectedArea = readSearchParam(params, "area") ?? ""
  const pendingPage = Number(readSearchParam(params, "pendientes_page") ?? "1") || 1
  const resolvedPage = Number(readSearchParam(params, "resueltas_page") ?? "1") || 1

  const requests = await prisma.consultingRequest.findMany({
    include: { company: { select: { id: true, name: true } } },
  })

  const companies = Array.from(
    new Map(requests.map((request) => [request.company.id, request.company])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name))

  const filtered = requests.filter(
    (request) =>
      (!selectedCompany || request.company_id === selectedCompany) &&
      (!selectedArea || request.area === selectedArea),
  )

  const pendingAll = filtered
    .filter((request) => request.status === "PENDING")
    .sort((a, b) => toDateKey(a.preferred_date).localeCompare(toDateKey(b.preferred_date)))
  const resolvedAll = filtered
    .filter((request) => request.status !== "PENDING")
    .sort((a, b) => toDateKey(b.preferred_date).localeCompare(toDateKey(a.preferred_date)))

  const pending = paginate(pendingAll, pendingPage, PAGE_SIZE)
  const resolved = paginate(resolvedAll, resolvedPage, PAGE_SIZE)

  const basePath = "/superadmin/consulting"

  function buildPageUrl(key: "pendientes_page" | "resueltas_page") {
    return (page: number) => {
      const searchParams = new URLSearchParams()
      if (selectedCompany) searchParams.set("empresa", selectedCompany)
      if (selectedArea) searchParams.set("area", selectedArea)
      if (page > 1) searchParams.set(key, String(page))
      const serialized = searchParams.toString()
      return serialized ? `${basePath}?${serialized}` : basePath
    }
  }

  function renderRow(request: RequestWithCompany) {
    const areaOption = getConsultingArea(request.area)
    const Icon = areaOption?.icon ?? CalendarClock

    return (
      <div
        key={request.id}
        className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-portal-blue-soft text-portal-blue">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1a1a1a]">
            {areaOption?.label ?? request.area} · {request.company.name}
          </p>
          <p className="truncate text-xs text-[#64748b]">
            {formatConsultingDateTime(toDateKey(request.preferred_date), request.preferred_time)} ·{" "}
            {request.contact_phone} ·{" "}
            {CONSULTING_CONTACT_METHOD_LABELS[request.contact_method] ?? request.contact_method}
          </p>
          <p className="truncate text-xs text-slate-400" title={request.context}>
            {request.context}
          </p>
        </div>
        <StatusLabel
          status={request.status}
          variantMap={CONSULTING_STATUS_VARIANT}
          labelMap={CONSULTING_STATUS_LABEL}
        />
        {request.status === "PENDING" ? (
          <ConsultingRequestActions
            requestId={request.id}
            areaLabel={areaOption?.label ?? request.area}
            companyName={request.company.name}
            preferredDate={toDateKey(request.preferred_date)}
            preferredTime={request.preferred_time}
          />
        ) : null}
      </div>
    )
  }

  return (
    <Stack spacing={3}>
      <PageHeader title="Consultorías" description="Solicitudes de sesión de todas las empresas" />

      {success ? (
        <DismissibleAlert severity="success">
          {successMessages[success] ?? success}
        </DismissibleAlert>
      ) : null}
      {error ? (
        <DismissibleAlert severity="error">{errorMessages[error] ?? error}</DismissibleAlert>
      ) : null}

      <ConsultingFilters
        companies={companies}
        areas={CONSULTING_AREAS}
        selectedCompany={selectedCompany}
        selectedArea={selectedArea}
        basePath={basePath}
      />

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
          Pendientes
          <span className="ml-2 text-sm font-normal text-[#94a3b8]">{pendingAll.length}</span>
        </h2>
        {pendingAll.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay solicitudes pendientes por revisar.
          </div>
        ) : (
          <>
            <div className="space-y-2">{pending.items.map(renderRow)}</div>
            <Pagination
              currentPage={pending.currentPage}
              totalPages={pending.totalPages}
              totalResults={pending.totalResults}
              buildPageUrl={buildPageUrl("pendientes_page")}
            />
          </>
        )}
      </section>

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
          Resueltas
          <span className="ml-2 text-sm font-normal text-[#94a3b8]">{resolvedAll.length}</span>
        </h2>
        {resolvedAll.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            Aún no hay solicitudes confirmadas o canceladas.
          </div>
        ) : (
          <>
            <div className="space-y-2">{resolved.items.map(renderRow)}</div>
            <Pagination
              currentPage={resolved.currentPage}
              totalPages={resolved.totalPages}
              totalResults={resolved.totalResults}
              buildPageUrl={buildPageUrl("resueltas_page")}
            />
          </>
        )}
      </section>
    </Stack>
  )
}
