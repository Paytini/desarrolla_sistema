import { Award, Clock, FileText, Users, type LucideIcon } from "lucide-react"
import { formatDateTime } from "@/lib/format"
import type { PortalCertificateRecord, PortalCourseRecord } from "@/lib/learning-types"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

type CompanyEmployee = {
  id: number
  nombre: string
  apellido: string
  email: string
  constancias: PortalCertificateRecord[]
  cursos: PortalCourseRecord[]
}
type EmployeeCourse = PortalCourseRecord
type CompanyCertificate = PortalCertificateRecord & {
  empleadoNombre: string
  empleadoEmail: string
}
type PendingCertificate = {
  id: string
  empleadoNombre: string
  empleadoEmail: string
  courseName: string
  completedAt: Date | null
}

async function getCompanyCertificatesRecord(empresaId: number) {
  return prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      empleados: {
        where: { activo: true },
        include: {
          constancias: {
            orderBy: [{ fecha_emision: "desc" }, { nombre_curso: "asc" }],
          },
          cursos: {
            orderBy: [{ completado: "desc" }, { fecha_completado: "desc" }],
          },
        },
        orderBy: { nombre: "asc" },
      },
    },
  })
}

function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconCls,
}: {
  label: string
  value: string
  sub?: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function Dc3Preview({ constancia }: { constancia: CompanyCertificate }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white">
      <div className="bg-teal-600 px-5 py-3 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-200">
          Secretaría del Trabajo y Previsión Social
        </p>
        <p className="text-sm font-bold text-white">Constancia de Habilidades Laborales</p>
        <p className="text-[10px] text-teal-200">DC-3 Oficial STPS</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Empleado</p>
          <p className="mt-0.5 text-base font-bold text-slate-950">{constancia.empleadoNombre}</p>
          <p className="text-xs text-slate-500">{constancia.empleadoEmail}</p>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Curso</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">{constancia.nombre_curso}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-center text-xs">
          <div>
            <p className="font-medium text-slate-400">Folio</p>
            <p className="mt-0.5 font-mono font-semibold text-slate-800">{constancia.folio}</p>
          </div>
          <div>
            <p className="font-medium text-slate-400">Emisión</p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {formatDateTime(constancia.fecha_emision)}
            </p>
          </div>
        </div>

        <a
          href={`/api/constancias/${constancia.id}/dc3`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <FileText size={14} strokeWidth={2} />
          Descargar DC-3
        </a>
      </div>
    </div>
  )
}

export default async function EmpresaConstanciasPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const empresa = await getCompanyCertificatesRecord(session.user.empresa_id)
  if (!empresa) redirect("/login")

  const constancias: CompanyCertificate[] = empresa.empleados.flatMap(
    (empleado: CompanyEmployee) =>
      empleado.constancias.map((constancia: PortalCertificateRecord) => ({
        ...constancia,
        empleadoNombre: `${empleado.nombre} ${empleado.apellido}`.trim(),
        empleadoEmail: empleado.email,
      }))
  )

  const pendingCertificates: PendingCertificate[] = empresa.empleados.flatMap(
    (empleado: CompanyEmployee) => {
      const existingCourseIds = new Set(
        empleado.constancias.map((c: PortalCertificateRecord) => c.wp_curso_id)
      )
      return empleado.cursos
        .filter(
          (course: EmployeeCourse) =>
            course.completado && !existingCourseIds.has(course.wp_curso_id)
        )
        .map((course: EmployeeCourse) => ({
          id: `${empleado.id}-${course.wp_curso_id}`,
          empleadoNombre: `${empleado.nombre} ${empleado.apellido}`.trim(),
          empleadoEmail: empleado.email,
          courseName: course.nombre_curso,
          completedAt: course.fecha_completado,
        }))
    }
  )

  const latestCertificate = [...constancias].sort(
    (a, b) =>
      new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()
  )[0]
  const employeesWithCertificates = new Set(
    constancias.map((c: CompanyCertificate) => c.empleadoEmail)
  ).size

  return (
    <div className="space-y-6">
      <header className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
          RH / Empresa
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Constancias DC-3</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Constancias emitidas"
          value={String(constancias.length)}
          sub="Total registradas"
          Icon={Award}
          iconCls="bg-teal-50 text-teal-600"
        />
        <KpiCard
          label="Empleados con constancia"
          value={String(employeesWithCertificates)}
          sub="Al menos una emitida"
          Icon={Users}
          iconCls="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Pendientes"
          value={String(pendingCertificates.length)}
          sub="Cursos sin constancia aún"
          Icon={Clock}
          iconCls="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Última emisión"
          value={
            latestCertificate
              ? formatDateTime(latestCertificate.fecha_emision)
              : "Sin constancias"
          }
          Icon={FileText}
          iconCls="bg-slate-100 text-slate-500"
        />
      </div>

      {/* DC-3 preview of latest + main content */}
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Main lists */}
        <div className="space-y-5">
          {/* Issued */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-950">
              Constancias emitidas
              <span className="ml-2 text-sm font-normal text-slate-400">{constancias.length}</span>
            </h2>

            {constancias.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aún no hay constancias emitidas para los empleados activos.
              </div>
            ) : (
              <div className="space-y-2">
                {constancias.map((constancia: CompanyCertificate) => {
                  const initials = getInitials(constancia.empleadoNombre)
                  return (
                    <div
                      key={constancia.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-bold text-teal-700">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {constancia.nombre_curso}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {constancia.empleadoNombre} · Folio:{" "}
                          <span className="font-mono">{constancia.folio}</span>
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-xs text-slate-400 sm:block">
                        {formatDateTime(constancia.fecha_emision)}
                      </p>
                      <div className="flex shrink-0 gap-1.5">
                        {constancia.wp_cert_url ? (
                          <a
                            href={constancia.wp_cert_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver
                          </a>
                        ) : null}
                        <a
                          href={`/api/constancias/${constancia.id}/dc3`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                        >
                          DC-3
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Pending */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-950">
              Pendientes por aparecer
              <span className="ml-2 text-sm font-normal text-slate-400">
                {pendingCertificates.length}
              </span>
            </h2>

            {pendingCertificates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50 px-4 py-5 text-center text-sm text-teal-800">
                Todo lo emitido ya está reflejado. No hay pendientes.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingCertificates.map((item: PendingCertificate) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-700">
                      {getInitials(item.empleadoNombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-amber-950">
                        {item.courseName}
                      </p>
                      <p className="truncate text-xs text-amber-700">
                        {item.empleadoNombre}
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
          </section>
        </div>

        {/* DC-3 Preview panel */}
        <aside className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Última DC-3 emitida
          </p>
          {latestCertificate ? (
            <Dc3Preview constancia={latestCertificate} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
              Sin constancias aún
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
