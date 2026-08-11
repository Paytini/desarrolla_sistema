import type { ConsultingRequest } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { cancelConsultingRequestAction } from "./actions"
import { CancelConsultingRequestButton } from "@/components/company/consulting/CancelConsultingRequestButton"
import { PageHeader } from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import StatusToast from "@/components/shared/StatusToast"
import { getCompanyBranding } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import { getConsultingArea } from "@/lib/consulting-areas"
import { formatConsultingDateTime, getTodayInConsultingTimeZone } from "@/lib/consulting-schedule"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { getSession } from "@/lib/session"

const successMessages: Record<string, string> = {
  solicitud_cancelada: "La solicitud de consultoría fue cancelada.",
}

const errorMessages: Record<string, string> = {
  solicitud: "No se encontró la solicitud o ya no se puede cancelar.",
}

const STATUS_VARIANT = {
  PENDING: "amber",
  CONFIRMED: "green",
  CANCELLED: "red",
} as const

const STATUS_LABEL = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
} as const

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default async function CompanyConsultingDashboardPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const branding = await getCompanyBranding(session.user.empresa_id)
  if (!branding) redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const requests = await prisma.consultingRequest.findMany({
    where: { company_id: session.user.empresa_id },
  })

  const today = getTodayInConsultingTimeZone()
  const upcoming = requests
    .filter((request) => request.status !== "CANCELLED" && toDateKey(request.preferred_date) >= today)
    .sort((a, b) => toDateKey(a.preferred_date).localeCompare(toDateKey(b.preferred_date)))
  const history = requests
    .filter((request) => request.status === "CANCELLED" || toDateKey(request.preferred_date) < today)
    .sort((a, b) => toDateKey(b.preferred_date).localeCompare(toDateKey(a.preferred_date)))

  const returnTo = companyPath(branding.slug, "/consulting")

  function renderRow(request: ConsultingRequest) {
    const areaOption = getConsultingArea(request.area)
    const Icon = areaOption?.icon ?? CalendarClock

    return (
      <div
        key={request.id}
        className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FE] text-[#3579F5]">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1a1a1a]">
            {areaOption?.label ?? request.area}
          </p>
          <p className="truncate text-xs text-[#64748b]">
            {formatConsultingDateTime(toDateKey(request.preferred_date), request.preferred_time)}
          </p>
        </div>
        <StatusBadge variant={STATUS_VARIANT[request.status]} dot>
          {STATUS_LABEL[request.status]}
        </StatusBadge>
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
        breadcrumbs={[{ label: "Empresa", href: companyPath(branding.slug, "/home") }, { label: "Consultoría" }]}
        action={
          <Link
            href={companyPath(branding.slug, "/consulting/new")}
            className="inline-flex items-center rounded-xl bg-[#3579F5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
          >
            Agendar nueva consultoría
          </Link>
        }
      />

      {success ? <StatusToast tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? <StatusToast tone="error" message={errorMessages[error] ?? error} /> : null}

      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
            Próximas
            <span className="ml-2 text-sm font-normal text-[#94a3b8]">{upcoming.length}</span>
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no tienes consultorías agendadas.
            </div>
          ) : (
            <div className="space-y-2">{upcoming.map(renderRow)}</div>
          )}
        </section>

        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
            Historial
            <span className="ml-2 text-sm font-normal text-[#94a3b8]">{history.length}</span>
          </h2>
          {history.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no tienes historial de consultorías.
            </div>
          ) : (
            <div className="space-y-2">{history.map(renderRow)}</div>
          )}
        </section>
      </div>
    </div>
  )
}
