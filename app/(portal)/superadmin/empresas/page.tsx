import InfoCard from "@/components/portal/InfoCard"
import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"
import StatusNotice from "@/components/portal/StatusNotice"
import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { AlertCircle, Building2, Clock, Download, Plus, Users } from "lucide-react"
import Link from "next/link"
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Empresas clientes"
        description="Gestiona las organizaciones activas en la plataforma"
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8761A] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-[#C45F0A]">
              <Plus size={14} strokeWidth={2.5} />
              Nueva empresa
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-[13.5px] font-semibold text-[#1a1a1a] transition hover:bg-[#f8fafc]">
              <Download size={14} strokeWidth={2} />
              Exportar CSV
            </button>
          </>
        }
      />

      {success ? <StatusNotice tone="success" message={successMessages[success] ?? success} /> : null}
      {error ? <StatusNotice tone="error" message={errorMessages[error] ?? error} /> : null}

      {/* KPI strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Empresas activas" value={String(empresasActivas)} sub={`${empresas.length} registradas en total`} icon={Building2} borderColor="orange" />
        <KpiCard label="Total cupos vendidos" value={String(cuposVendidos)} sub="Capacidad comprometida total" icon={Users} borderColor="charcoal" />
        <KpiCard label="Cupos en uso" value={String(cuposUsados)} sub={`Ocupación global: ${occupancyPct}%`} icon={Clock} borderColor="amber" />
        <KpiCard label="Colaboradores suspendidos" value={String(colaboradoresSuspendidos)} sub="Sin acceso activo" icon={AlertCircle} borderColor="rose" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        {/* Alta de empresa */}
        <article className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <h2 className="mb-1 text-[15px] font-bold text-[#1a1a1a]">Alta de empresa</h2>
          <p className="mb-5 text-sm text-[#64748b]">Crea la empresa, su usuario RH primario y opcionalmente asigna el paquete inicial.</p>
          <form action={createCompanyAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Nombre de la empresa</span>
                <input name="nombre" required className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Correo RH</span>
                <input name="email_rh" type="email" required className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Nombre responsable RH</span>
                <input name="nombre_rh" required className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Password temporal RH</span>
                <input name="password_rh" type="password" minLength={8} required className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Teléfono</span>
                <input name="telefono" className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">RFC</span>
                <input name="rfc" className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Cupos contratados</span>
                <input name="asientos_contratados" type="number" min={1} defaultValue={25} required className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Paquete inicial</span>
                <select name="paquete_id" defaultValue="" className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]">
                  <option value="">Sin asignar todavía</option>
                  {paquetes.map((paquete) => (
                    <option key={paquete.id} value={paquete.id}>{paquete.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Vigencia del paquete</span>
                <input name="fecha_vencimiento" type="date" className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold uppercase tracking-[0.5px] text-[10.5px] text-[#64748b]">Notas internas</span>
              <textarea name="notas" rows={3} className="rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13.5px] outline-none transition focus:border-[#E8761A]" />
            </label>
            <button type="submit" className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#E8761A] px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-[#C45F0A]">
              <Plus size={14} strokeWidth={2.5} />
              Crear empresa y acceso RH
            </button>
          </form>
        </article>

        {/* Lista de empresas */}
        <article className="rounded-xl border border-[#f0f0f0] bg-white p-6">
          <h2 className="mb-1 text-[15px] font-bold text-[#1a1a1a]">Empresas registradas</h2>
          <p className="mb-5 text-sm text-[#64748b]">Vista operativa con cupos, paquete activo y acciones rápidas.</p>

          <div className="space-y-3">
            {empresas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#94a3b8]">
                Aún no hay empresas registradas.
              </div>
            ) : null}

            {empresas.map((empresa) => {
              const rh = empresa.usuarios[0]
              const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "Sin paquete asignado"
              const empleadosActivos = empresa.empleados.filter((e) => e.activo).length
              const cuposDisponibles = Math.max(empresa.asientos_contratados - empleadosActivos, 0)
              const ocupacionEmpresa = empresa.asientos_contratados
                ? Math.round((empleadosActivos / empresa.asientos_contratados) * 100)
                : 0
              const barColor = ocupacionEmpresa >= 80 ? "#E8761A" : ocupacionEmpresa >= 60 ? "#f59e0b" : "#22c55e"

              return (
                <div key={empresa.id} className="rounded-xl border border-[#f0f0f0] bg-[#f8fafc] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-bold text-[#1a1a1a]">{empresa.nombre}</h3>
                        <StatusBadge variant={empresa.activo ? "green" : "slate"} dot>
                          {empresa.activo ? "Activa" : "Suspendida"}
                        </StatusBadge>
                      </div>
                      <div className="grid gap-1.5 text-[13px] text-[#64748b] md:grid-cols-2">
                        <p><span className="font-semibold text-[#1a1a1a]">RH:</span> {rh ? `${rh.nombre} · ${rh.email}` : empresa.email_rh}</p>
                        <p><span className="font-semibold text-[#1a1a1a]">Paquete:</span> {paquete}</p>
                        <p><span className="font-semibold text-[#1a1a1a]">Cupos:</span> {empleadosActivos}/{empresa.asientos_contratados}</p>
                        <p><span className="font-semibold text-[#1a1a1a]">Disponibles:</span> {cuposDisponibles}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f0f0]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${ocupacionEmpresa}%`, background: barColor }} />
                        </div>
                        <span className="text-[11px] text-[#94a3b8]">{ocupacionEmpresa}%</span>
                      </div>
                      {empresa.notas ? <p className="text-[13px] text-[#64748b]">{empresa.notas}</p> : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/superadmin/empresas/${empresa.id}`} className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1a1a1a] transition hover:bg-[#f8fafc]">
                        Ver detalle →
                      </Link>
                      <form action={updateCompanySeatsAction} className="flex items-center gap-2">
                        <input type="hidden" name="empresa_id" value={empresa.id} />
                        <input name="asientos_contratados" type="number" min={Math.max(empleadosActivos, 1)} defaultValue={empresa.asientos_contratados} className="w-20 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-[13px] outline-none transition focus:border-[#E8761A]" />
                        <button type="submit" className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1a1a1a] transition hover:bg-[#f8fafc]">
                          Actualizar cupos
                        </button>
                      </form>
                      <form action={toggleCompanyStatusAction}>
                        <input type="hidden" name="empresa_id" value={empresa.id} />
                        <button type="submit" className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${empresa.activo ? "bg-[#1a1a1a] text-white hover:bg-[#333]" : "bg-[#E8761A] text-white hover:bg-[#C45F0A]"}`}>
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
