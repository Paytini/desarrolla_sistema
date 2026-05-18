import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusNotice from "@/components/portal/StatusNotice"
import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import {
  createCompanyAction,
  toggleCompanyStatusAction,
  updateCompanySeatsAction,
} from "./actions"

const successMessages: Record<string, string> = {
  empresa_creada: "La empresa se creo correctamente con su usuario RH inicial.",
  empresa_suspendida: "La empresa fue suspendida. Ya no deberia operar nuevos accesos hasta reactivarse.",
  empresa_activada: "La empresa fue reactivada correctamente.",
  cupos_actualizados: "Los cupos contratados se actualizaron correctamente.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para crear la empresa.",
  email_rh: "Ese correo RH ya esta ligado a una empresa.",
  usuario_rh: "Ese correo ya existe como usuario del portal.",
  empresa: "No se encontro la empresa solicitada.",
  cupos: "No fue posible actualizar cupos. Revisa que el valor sea mayor a cero.",
  cupos_menor_uso:
    "No puedes definir cupos contratados por debajo de los cupos actualmente usados por esa empresa.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmpresasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const { empresas, paquetes } = await getSuperadminEmpresasSnapshot()

  const empresasActivas = empresas.filter((empresa) => empresa.activo).length
  const cuposVendidos = empresas.reduce(
    (total, empresa) => total + empresa.asientos_contratados,
    0
  )
  const cuposUsados = empresas.reduce((total, empresa) => total + empresa.asientos_usados, 0)
  const colaboradoresSuspendidos = empresas.reduce(
    (total, empresa) => total + empresa.empleados.filter((empleado) => !empleado.activo).length,
    0
  )
  const occupancyPct = cuposVendidos ? Math.round((cuposUsados / cuposVendidos) * 100) : 0
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SuperAdmin"
        title="Gestion central de empresas y paquetes"
        description="Aqui ya puedes dar de alta empresas reales, crear su usuario RH inicial y vincularles un paquete corporativo dentro del portal."
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard
          title="Empresas activas"
          value={String(empresasActivas)}
          description="Clientes empresariales con acceso operativo al portal."
          accent="teal"
        />
        <InfoCard
          title="Cupos vendidos"
          value={String(cuposVendidos)}
          description="Capacidad total comprometida entre todas las empresas."
          accent="amber"
        />
        <InfoCard
          title="Cupos en uso"
          value={String(cuposUsados)}
          description="Empleados activos ocupando lugares dentro de sus paquetes."
          accent="violet"
        />
        <InfoCard
          title="Colaboradores suspendidos"
          value={String(colaboradoresSuspendidos)}
          description={`Ocupacion global actual: ${occupancyPct}% del total contratado.`}
          accent="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Alta de empresa</h2>
            <p className="text-sm leading-6 text-slate-600">
              Crea la empresa, su usuario RH primario y opcionalmente asigna el paquete inicial.
            </p>
          </div>

          <form action={createCompanyAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Nombre de la empresa</span>
                <input
                  name="nombre"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-0 transition focus:border-teal-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Correo RH</span>
                <input
                  name="email_rh"
                  type="email"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Nombre del responsable RH</span>
                <input
                  name="nombre_rh"
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Password temporal RH</span>
                <input
                  name="password_rh"
                  type="password"
                  minLength={8}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Telefono</span>
                <input
                  name="telefono"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">RFC</span>
                <input
                  name="rfc"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Cupos contratados</span>
                <input
                  name="asientos_contratados"
                  type="number"
                  min={1}
                  defaultValue={25}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-teal-950">Datos para constancias DC-3</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">Representante legal</span>
                  <input
                    name="representante_legal"
                    placeholder="Nombre completo"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-teal-600"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">
                    Representante de trabajadores
                  </span>
                  <input
                    name="representante_laboral"
                    placeholder="Si aplica"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-teal-600"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Paquete inicial</span>
                <select
                  name="paquete_id"
                  defaultValue=""
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                >
                  <option value="">Sin asignar todavia</option>
                  {paquetes.map((paquete) => (
                    <option key={paquete.id} value={paquete.id}>
                      {paquete.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Vigencia del paquete</span>
                <input
                  name="fecha_vencimiento"
                  type="date"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Notas internas</span>
              <textarea
                name="notas"
                rows={4}
                className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-teal-600"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit items-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Crear empresa y acceso RH
            </button>
          </form>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-lg font-semibold text-slate-950">Empresas registradas</h2>
            <p className="text-sm leading-6 text-slate-600">
              Vista operativa con cupos, paquete activo y acceso rapido para activar o suspender.
            </p>
          </div>

          <div className="space-y-4">
            {empresas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay empresas registradas.
              </div>
            ) : null}

            {empresas.map((empresa) => {
              const rh = empresa.usuarios[0]
              const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "Sin paquete asignado"
              const empleadosActivos = empresa.empleados.filter((empleado) => empleado.activo).length
              const empleadosSuspendidos = empresa.empleados.length - empleadosActivos
              const cuposDisponibles = Math.max(empresa.asientos_contratados - empleadosActivos, 0)
              const ocupacionEmpresa = empresa.asientos_contratados
                ? Math.round((empleadosActivos / empresa.asientos_contratados) * 100)
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
                          <span className="font-medium text-slate-800">RH:</span>{" "}
                          {rh ? `${rh.nombre} · ${rh.email}` : empresa.email_rh}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Paquete:</span> {paquete}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Cupos:</span>{" "}
                          {empleadosActivos}/{empresa.asientos_contratados}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Disponibles:</span>{" "}
                          {cuposDisponibles}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Suspendidos:</span>{" "}
                          {empleadosSuspendidos}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Ocupacion:</span>{" "}
                          {ocupacionEmpresa}%
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Creada:</span>{" "}
                          {formatDate(empresa.created_at)}
                        </p>
                      </div>

                      {empresa.notas ? (
                        <p className="text-sm leading-6 text-slate-500">{empresa.notas}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={updateCompanySeatsAction} className="flex items-center gap-2">
                        <input type="hidden" name="empresa_id" value={empresa.id} />
                        <input
                          name="asientos_contratados"
                          type="number"
                          min={Math.max(empleadosActivos, 1)}
                          defaultValue={empresa.asientos_contratados}
                          className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-600"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                          Actualizar cupos
                        </button>
                      </form>

                      <form action={toggleCompanyStatusAction}>
                        <input type="hidden" name="empresa_id" value={empresa.id} />
                        <button
                          type="submit"
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            empresa.activo
                              ? "bg-slate-900 text-white hover:bg-slate-700"
                              : "bg-teal-700 text-white hover:bg-teal-800"
                          }`}
                        >
                          {empresa.activo ? "Suspender" : "Reactivar"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

    </div>
  )
}
