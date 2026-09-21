import type { ConsultingRequest } from "@prisma/client"
import { CalendarClock } from "lucide-react"
import { redirect } from "next/navigation"
import Stack from "@mui/material/Stack"
import { ConsultingFilters } from "@/components/superadmin/ConsultingFilters"
import { ConsultingRequestActions } from "@/components/superadmin/ConsultingRequestActions"
import { ConsultingRequestDetailsButton } from "@/components/company/consulting/ConsultingRequestDetailsButton"
import { DataTable } from "@/components/shared/DataTable"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { CONSULTING_AREAS, getConsultingArea } from "@/lib/consulting/areas"
import { CONSULTING_CONTACT_METHOD_LABELS } from "@/lib/consulting/contact-method"
import { formatConsultingDateTime } from "@/lib/consulting/schedule"
import { CONSULTING_STATUS_LABEL, CONSULTING_STATUS_VARIANT } from "@/lib/consulting/status"
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

  function renderPendingRow(request: RequestWithCompany, index: number) {
    const areaOption = getConsultingArea(request.area)
    const Icon = areaOption?.icon ?? CalendarClock
    const areaLabel = areaOption?.label ?? request.area
    const contactMethodLabel =
      CONSULTING_CONTACT_METHOD_LABELS[request.contact_method] ?? request.contact_method

    return (
      <tr
        key={request.id}
        className={
          index % 2 === 0
            ? "bg-white transition-colors hover:bg-slate-100"
            : "bg-slate-50 transition-colors hover:bg-slate-100"
        }
      >
        <td className="rounded-l-lg px-3 py-3 text-sm text-slate-400">
          {String(index + 1).padStart(2, "0")}
        </td>
        <td className="px-3 py-3 text-base font-medium text-portal-ink">
          {request.company.name}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-portal-blue-soft text-portal-blue">
              <Icon size={16} />
            </div>
            <span className="min-w-0 truncate font-medium text-portal-ink">{areaLabel}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-sm text-slate-500">
          {formatConsultingDateTime(toDateKey(request.preferred_date), request.preferred_time)}
        </td>
        <td className="max-w-xs px-3 py-3 text-sm text-slate-500">
          <span className="block truncate" title={request.context}>
            {request.context}
          </span>
        </td>
        <td className="px-3 py-3">
          <StatusLabel
            status={request.status}
            variantMap={CONSULTING_STATUS_VARIANT}
            labelMap={CONSULTING_STATUS_LABEL}
          />
        </td>
        <td className="rounded-r-lg px-3 py-3">
          <div className="flex gap-1">
            <ConsultingRequestDetailsButton
              areaLabel={areaLabel}
              dateTimeLabel={formatConsultingDateTime(
                toDateKey(request.preferred_date),
                request.preferred_time,
              )}
              context={request.context}
              contactPhone={request.contact_phone}
              contactMethodLabel={contactMethodLabel}
              status={request.status}
            />
            <ConsultingRequestActions
              requestId={request.id}
              areaLabel={areaLabel}
              companyName={request.company.name}
              preferredDate={toDateKey(request.preferred_date)}
              preferredTime={request.preferred_time}
            />
          </div>
        </td>
      </tr>
    )
  }

  function renderHistoryRow(request: RequestWithCompany) {
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
          <p className="truncate text-sm font-semibold text-portal-ink">
            {areaOption?.label ?? request.area} · {request.company.name}
          </p>
          <p className="truncate text-xs text-slate-500">
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
        areas={CONSULTING_AREAS.map((area) => ({ id: area.id, label: area.label }))}
        selectedCompany={selectedCompany}
        selectedArea={selectedArea}
        basePath={basePath}
      />

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-xl font-semibold text-portal-ink">
          Pendientes
          <span className="ml-2 text-sm font-normal text-slate-400">{pendingAll.length}</span>
        </h2>
        {pendingAll.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay solicitudes pendientes por revisar.
          </div>
        ) : (
          <>
            <DataTable
              ariaLabel="Solicitudes pendientes"
              headerClassName="bg-slate-50 pt-2 first:rounded-l-lg last:rounded-r-lg text-sm font-normal normal-case tracking-normal text-slate-700"
              columns={[
                { label: "SL" },
                { label: "Empresa" },
                { label: "Área" },
                { label: "Fecha y hora" },
                { label: "Contexto" },
                { label: "Estado" },
                { label: "Acciones" },
              ]}
              rows={pending.items.map((request, index) => renderPendingRow(request, index))}
            />
            <Pagination
              currentPage={pending.currentPage}
              totalPages={pending.totalPages}
              totalResults={pending.totalResults}
              buildPageUrl={buildPageUrl("pendientes_page")}
              variant="numbered"
            />
          </>
        )}
      </section>

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-xl font-semibold text-portal-ink">
          Resueltas
          <span className="ml-2 text-sm font-normal text-slate-400">{resolvedAll.length}</span>
        </h2>
        {resolvedAll.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            Aún no hay solicitudes confirmadas o canceladas.
          </div>
        ) : (
          <>
            <div className="space-y-2">{resolved.items.map(renderHistoryRow)}</div>
            <Pagination
              currentPage={resolved.currentPage}
              totalPages={resolved.totalPages}
              totalResults={resolved.totalResults}
              buildPageUrl={buildPageUrl("resueltas_page")}
              variant="numbered"
            />
          </>
        )}
      </section>
    </Stack>
  )
}
