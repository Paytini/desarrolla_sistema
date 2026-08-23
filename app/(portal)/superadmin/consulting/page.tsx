import type { ConsultingRequest } from "@prisma/client"
import { CalendarClock } from "lucide-react"
import { redirect } from "next/navigation"
import Stack from "@mui/material/Stack"
import { ConsultingRequestActions } from "@/components/superadmin/ConsultingRequestActions"
import { DismissibleAlert } from "@/components/shared/DismissibleAlert"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { getConsultingArea } from "@/lib/consulting-areas"
import { formatConsultingDateTime } from "@/lib/consulting-schedule"
import { CONSULTING_STATUS_LABEL, CONSULTING_STATUS_VARIANT } from "@/lib/consulting-status"
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

const CONTACT_METHOD_LABELS: Record<string, string> = {
  CALL: "Llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type RequestWithCompany = ConsultingRequest & { company: { name: string } }

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default async function SuperAdminConsultingPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const requests = await prisma.consultingRequest.findMany({
    include: { company: { select: { name: true } } },
  })

  const pending = requests
    .filter((request) => request.status === "PENDING")
    .sort((a, b) => toDateKey(a.preferred_date).localeCompare(toDateKey(b.preferred_date)))
  const resolved = requests
    .filter((request) => request.status !== "PENDING")
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())

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
            {CONTACT_METHOD_LABELS[request.contact_method] ?? request.contact_method}
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

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
          Pendientes
          <span className="ml-2 text-sm font-normal text-[#94a3b8]">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            No hay solicitudes pendientes por revisar.
          </div>
        ) : (
          <div className="space-y-2">{pending.map(renderRow)}</div>
        )}
      </section>

      <section className="rounded-lg bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
          Resueltas
          <span className="ml-2 text-sm font-normal text-[#94a3b8]">{resolved.length}</span>
        </h2>
        {resolved.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-slate-500">
            Aún no hay solicitudes confirmadas o canceladas.
          </div>
        ) : (
          <div className="space-y-2">{resolved.map(renderRow)}</div>
        )}
      </section>
    </Stack>
  )
}
