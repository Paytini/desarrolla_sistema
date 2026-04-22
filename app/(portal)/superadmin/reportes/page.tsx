import { redirect } from "next/navigation"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { formatDate } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { triggerGlobalLearningSyncAction } from "./actions"

const successMessages: Record<string, string> = {
  sync_background_started:
    "La sincronizacion global se envio a segundo plano. El portal seguira respondiendo mientras se actualizan cursos, progreso y constancias.",
  sync_background_already_running:
    "Ya existe una sincronizacion global en proceso. Dejamos correr la actual para evitar trabajo duplicado.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  const value = params?.[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function SuperAdminReportesPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")
  const params = await searchParams
  const success = getParam(params, "success")

  const empresas = await prisma.empresa.findMany({
    orderBy: { nombre: "asc" },
    include: {
      paquetes: {
        where: { activo: true },
        orderBy: { created_at: "desc" },
        include: {
          paquete: {
            select: {
              nombre: true,
              modo_entrega: true,
            },
          },
        },
        take: 1,
      },
      empleados: {
        where: { activo: true },
        include: {
          cursos: {
            select: {
              progreso_pct: true,
              acceso_estado: true,
            },
          },
        },
      },
    },
  })

  const empresasActivas = empresas.filter((empresa) => empresa.activo)
  const totalEmpleadosActivos = empresasActivas.reduce((sum, empresa) => sum + empresa.empleados.length, 0)
  const totalCursosActivos = empresasActivas.reduce(
    (sum, empresa) => sum + empresa.empleados.reduce((employeeSum, empleado) => employeeSum + empleado.cursos.length, 0),
    0
  )
  const totalCourseProgress = empresasActivas.reduce(
    (sum, empresa) =>
      sum +
      empresa.empleados.reduce(
        (employeeSum, empleado) =>
          employeeSum + empleado.cursos.reduce((courseSum, curso) => courseSum + curso.progreso_pct, 0),
        0
      ),
    0
  )
  const averageProgress = totalCursosActivos > 0 ? Math.round(totalCourseProgress / totalCursosActivos) : 0
  const companiesWithAccessIssues = empresasActivas.filter((empresa) =>
    empresa.empleados.some((empleado) => empleado.cursos.some((curso) => curso.acceso_estado === "ERROR"))
  ).length
  const upcomingRenewals = empresasActivas.filter((empresa) => {
    const expiry = empresa.paquetes[0]?.fecha_vencimiento
    if (!expiry) {
      return false
    }

    const diffMs = new Date(expiry).getTime() - Date.now()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    return diffDays >= 0 && diffDays <= 30
  }).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Reportes globales del ecosistema empresarial"
        description="Esta vista concentra el estado general de las empresas clientes, renovaciones, avance academico agregado y puntos de seguimiento para cuentas corporativas."
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Sincronizacion de aprendizaje</h2>
            <p className="text-sm leading-6 text-slate-600">
              Lanza una actualizacion en segundo plano para empleados con datos vencidos, sin bloquear la navegacion del portal.
            </p>
          </div>

          <form action={triggerGlobalLearningSyncAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Actualizar ahora
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Avance por empresa"
          value={`${averageProgress}%`}
          description="Promedio academico agregado entre todos los cursos sincronizados del ecosistema B2B."
          accent="teal"
        />
        <InfoCard
          title="Renovaciones y vigencias"
          value={String(upcomingRenewals)}
          description="Empresas activas con paquete que vence en los proximos 30 dias."
          accent="amber"
        />
        <InfoCard
          title="Monitoreo de sincronizacion"
          value={String(companiesWithAccessIssues)}
          description="Empresas con al menos un empleado en error de acceso academico."
          accent="violet"
        />
        <InfoCard
          title="Empleados activos"
          value={String(totalEmpleadosActivos)}
          description="Base activa actual operando dentro del modelo corporativo."
          accent="slate"
        />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Salud operativa por empresa</h2>
          <p className="text-sm leading-6 text-slate-600">
            Resumen del flujo B2B: vigencia, modo de entrega del paquete y alertas de acceso academico por cuenta.
          </p>
        </div>

        <div className="space-y-4">
          {empresas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Aun no hay empresas registradas.
            </div>
          ) : null}

          {empresas.map((empresa) => {
            const activePackage = empresa.paquetes[0]
            const packageName = activePackage?.paquete.nombre ?? "Sin paquete activo"
            const deliveryMode =
              activePackage?.paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE"
                ? "Bundle privado + matricula directa"
                : "Matricula directa por curso"
            const courseCount = empresa.empleados.reduce((sum, empleado) => sum + empleado.cursos.length, 0)
            const issueCount = empresa.empleados.reduce(
              (sum, empleado) =>
                sum + empleado.cursos.filter((curso) => curso.acceso_estado === "ERROR").length,
              0
            )
            const companyProgress = courseCount
              ? Math.round(
                  empresa.empleados.reduce(
                    (sum, empleado) =>
                      sum + empleado.cursos.reduce((courseSum, curso) => courseSum + curso.progreso_pct, 0),
                    0
                  ) / courseCount
                )
              : 0

            return (
              <div
                key={empresa.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-slate-950">{empresa.nombre}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          empresa.activo
                            ? "bg-teal-100 text-teal-900"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {empresa.activo ? "Activa" : "Suspendida"}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">Paquete:</span> {packageName}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Modo B2B:</span> {deliveryMode}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Empleados activos:</span>{" "}
                        {empresa.empleados.length}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Avance promedio:</span> {companyProgress}%
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Alertas de acceso:</span> {issueCount}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Vigencia:</span>{" "}
                        {formatDate(activePackage?.fecha_vencimiento)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
