import KpiCard from "@/components/shared/KpiCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { Award, Clock, Users } from "lucide-react"
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

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
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

  const employeesWithCertificates = new Set(
    constancias.map((c: CompanyCertificate) => c.empleadoEmail)
  ).size

  return (
    <div className="space-y-6">
      <PageHeader title="Constancias DC-3" description="Constancias de habilidades laborales para cumplimiento STPS" accentColor="#F5853F" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Constancias emitidas" value={String(constancias.length)} sub="Total registradas" icon={Award} borderColor="orange" />
        <KpiCard label="Empleados con constancia" value={String(employeesWithCertificates)} sub="Al menos una emitida" icon={Users} borderColor="charcoal" />
        <KpiCard label="Pendientes" value={String(pendingCertificates.length)} sub="Cursos sin constancia aún" icon={Clock} borderColor="amber" />
      </div>

      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              Constancias emitidas
              <span className="ml-2 text-sm font-normal text-[#94a3b8]">{constancias.length}</span>
            </h2>
            {constancias.length > 0 ? (
              <a
                href="/api/constancias/zip"
                download
                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#111827] transition-all duration-200 hover:bg-gray-200"
              >
                Descargar ZIP
              </a>
            ) : null}
          </div>

          {constancias.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
              Aún no hay constancias emitidas para los empleados activos.
            </div>
          ) : (
            <div className="space-y-2">
              {constancias.map((constancia: CompanyCertificate) => {
                const initials = getInitials(constancia.empleadoNombre)
                return (
                  <div
                    key={constancia.id}
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 transition-all duration-200 hover:bg-gray-50"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2eb] text-xs font-bold text-[#F5853F]">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                        {constancia.nombre_curso}
                      </p>
                      <p className="truncate text-xs text-[#64748b]">
                        {constancia.empleadoNombre} · Folio:{" "}
                        <span className="font-mono">{constancia.folio}</span>
                      </p>
                    </div>
                    <p className="hidden shrink-0 text-xs text-[#94a3b8] sm:block">
                      {formatDateTime(constancia.fecha_emision)}
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      {constancia.wp_cert_url ? (
                        <a
                          href={constancia.wp_cert_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#111827] transition-all duration-200 hover:bg-gray-200"
                        >
                          Ver
                        </a>
                      ) : null}
                      <a
                        href={`/api/constancias/${constancia.id}/dc3`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#F5853F] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#D96B20]"
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

        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-[#1a1a1a]">
            Pendientes por aparecer
            <span className="ml-2 text-sm font-normal text-[#94a3b8]">
              {pendingCertificates.length}
            </span>
          </h2>

          {pendingCertificates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#f0f0f0] bg-[#f8fafc] px-4 py-5 text-center text-sm text-[#64748b]">
              Todo lo emitido ya está reflejado. No hay pendientes.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingCertificates.map((item: PendingCertificate) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
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
    </div>
  )
}
