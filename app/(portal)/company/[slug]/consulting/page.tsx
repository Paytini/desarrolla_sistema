import type { ConsultingRequest } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { cancelConsultingRequestAction } from "./actions"
import { CancelConsultingRequestButton } from "@/components/company/consulting/CancelConsultingRequestButton"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { StatusLabel } from "@/components/shared/StatusLabel"
import StatusToast from "@/components/shared/StatusToast"
import { getCompanyBranding } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import { getConsultingArea } from "@/lib/consulting-areas"
import { formatConsultingDateTime, getTodayInConsultingTimeZone } from "@/lib/consulting-schedule"
import { CONSULTING_STATUS_LABEL, CONSULTING_STATUS_VARIANT } from "@/lib/consulting-status"
import { paginate } from "@/lib/pagination"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"

const successMessages: Record<string, string> = {
  solicitud_cancelada: "La solicitud de consultoría fue cancelada.",
}

const errorMessages: Record<string, string> = {
  solicitud: "No se encontró la solicitud o ya no se puede cancelar.",
}

const PAGE_SIZE = 5

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default async function CompanyConsultingDashboardPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) redirect("/login")

  const branding = await getCompanyBranding(session.user.empresa_id)
  if (!branding) redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const proximasPage = Number(readSearchParam(params, "proximas_page") ?? "1") || 1
  const historialPage = Number(readSearchParam(params, "historial_page") ?? "1") || 1

  const requests = await prisma.consultingRequest.findMany({
    where: { company_id: session.user.empresa_id },
  })

  const today = getTodayInConsultingTimeZone()
  const upcomingAll = requests
    .filter(
      (request) => request.status !== "CANCELLED" && toDateKey(request.preferred_date) >= today,
    )
    .sort((a, b) => toDateKey(a.preferred_date).localeCompare(toDateKey(b.preferred_date)))
  const historyAll = requests
    .filter(
      (request) => request.status === "CANCELLED" || toDateKey(request.preferred_date) < today,
    )
    .sort((a, b) => toDateKey(b.preferred_date).localeCompare(toDateKey(a.preferred_date)))

  const upcoming = paginate(upcomingAll, proximasPage, PAGE_SIZE)
  const history = paginate(historyAll, historialPage, PAGE_SIZE)

  const returnTo = companyPath(branding.slug, "/consulting")

  function buildPageUrl(key: "proximas_page" | "historial_page") {
    return (page: number) => {
      const searchParams = new URLSearchParams()
      if (page > 1) searchParams.set(key, String(page))
      const serialized = searchParams.toString()
      return serialized ? `${returnTo}?${serialized}` : returnTo
    }
  }

  function renderRow(request: ConsultingRequest) {
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
            {areaOption?.label ?? request.area}
          </p>
          <p className="truncate text-xs text-[#64748b]">
            {formatConsultingDateTime(toDateKey(request.preferred_date), request.preferred_time)}
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
          <CancelConsultingRequestButton
            action={cancelConsultingRequestAction}
            requestId={request.id}
            areaLabel={areaOption?.label ?? request.area}
            returnTo={returnTo}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultoría"
        description="Sesiones en vivo con nuestro equipo de consultores"
        action={
          <Link
            href={companyPath(branding.slug, "/consulting/new")}
            className="inline-flex items-center rounded-xl bg-portal-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-portal-blue-hover"
          >
            Agendar nueva consultoría
          </Link>
        }
      />

      {success ? (
        <StatusToast tone="success" message={successMessages[success] ?? success} />
      ) : null}
      {error ? <StatusToast tone="error" message={errorMessages[error] ?? error} /> : null}

      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
            Próximas
            <span className="ml-2 text-sm font-normal text-[#94a3b8]">{upcomingAll.length}</span>
          </h2>
          {upcomingAll.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no tienes consultorías agendadas.
            </div>
          ) : (
            <>
              <div className="space-y-2">{upcoming.items.map(renderRow)}</div>
              <Pagination
                currentPage={upcoming.currentPage}
                totalPages={upcoming.totalPages}
                totalResults={upcoming.totalResults}
                buildPageUrl={buildPageUrl("proximas_page")}
              />
            </>
          )}
        </section>

        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
            Historial
            <span className="ml-2 text-sm font-normal text-[#94a3b8]">{historyAll.length}</span>
          </h2>
          {historyAll.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no tienes historial de consultorías.
            </div>
          ) : (
            <>
              <div className="space-y-2">{history.items.map(renderRow)}</div>
              <Pagination
                currentPage={history.currentPage}
                totalPages={history.totalPages}
                totalResults={history.totalResults}
                buildPageUrl={buildPageUrl("historial_page")}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
