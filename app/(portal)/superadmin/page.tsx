import KpiCard from "@/components/portal/KpiCard"
import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { getSession } from "@/lib/session"
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronRight,
  Package,
  Plug,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

const DAY_MS = 1000 * 60 * 60 * 24

function RingChart({ pct, label }: { pct: number; label: string }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#E8761A"

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 84 84" className="size-20">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
        />
        <text x="42" y="46" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f172a">
          {pct}%
        </text>
      </svg>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

// ── Horizontal mini-bar per company ──────────────────────────────────
function CompanyBar({
  nombre,
  usados,
  contratados,
}: {
  nombre: string
  usados: number
  contratados: number
}) {
  const pct = contratados ? Math.round((usados / contratados) * 100) : 0
  const barColor = pct >= 90 ? "bg-rose-400" : pct >= 70 ? "bg-amber-400" : "bg-[#E8761A]"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="max-w-[55%] truncate text-xs font-medium text-slate-700">{nombre}</p>
        <p className="text-xs text-slate-400">
          {usados}/{contratados}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Quick-access card ─────────────────────────────────────────────────
function QuickLink({
  href,
  label,
  description,
  Icon,
  iconCls,
}: {
  href: string
  label: string
  description: string
  Icon: LucideIcon
  iconCls: string
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group flex items-center gap-3.5 rounded-xl border border-[#f0f0f0] bg-white p-4 transition hover:shadow-sm"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon size={17} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="truncate text-[11px] text-slate-400">{description}</p>
      </div>
      <ChevronRight
        size={15}
        strokeWidth={2}
        className="shrink-0 text-slate-300 transition group-hover:text-slate-500"
      />
    </Link>
  )
}

export default async function SuperadminDashboardPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const { empresas } = await getSuperadminEmpresasSnapshot()
  const now = Date.now()

  const empresasActivas = empresas.filter((e) => e.activo).length
  const totalEmpleadosActivos = empresas.reduce(
    (s, e) => s + e.empleados.filter((emp) => emp.activo).length,
    0
  )
  const totalContratados = empresas.reduce((s, e) => s + e.asientos_contratados, 0)
  const totalUsados = empresas.reduce((s, e) => s + e.asientos_usados, 0)
  const ocupacionPct = totalContratados ? Math.round((totalUsados / totalContratados) * 100) : 0

  const renewals = empresas
    .filter((e) => {
      const exp = e.paquetes[0]?.fecha_vencimiento
      if (!exp) return false
      return Math.floor((new Date(exp).getTime() - now) / DAY_MS) <= 30
    })
    .map((e) => {
      const days = Math.floor((new Date(e.paquetes[0]!.fecha_vencimiento as Date).getTime() - now) / DAY_MS)
      return { empresa: e, days }
    })
    .sort((a, b) => a.days - b.days)

  const nombre = session.user.nombre as string

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <section
        className="rounded-xl px-8 py-7"
        style={{ background: "#E8761A" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[1px] text-white/70">
          SuperAdmin · Portal Desarrolla360
        </p>
        <h1 className="mt-1 text-[28px] font-bold text-white">
          Bienvenido,{" "}
          <span className="rounded-lg bg-white/20 px-2 py-0.5">{nombre}</span>
        </h1>
        <p className="mt-1 text-[14px] text-white/75">Vista ejecutiva del portal empresarial.</p>
      </section>

      {/* KPI strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Empresas activas"
          value={String(empresasActivas)}
          sub={`${empresas.length} registrada${empresas.length !== 1 ? "s" : ""} en total`}
          icon={Building2}
          borderColor="orange"
        />
        <KpiCard
          label="Empleados activos"
          value={String(totalEmpleadosActivos)}
          sub="Colaboradores con acceso al LMS"
          icon={Users}
          borderColor="charcoal"
        />
        <KpiCard
          label="Ocupación global"
          value={`${ocupacionPct}%`}
          sub={`${totalUsados} de ${totalContratados} cupos en uso`}
          icon={BarChart3}
          borderColor="amber"
        />
        <KpiCard
          label="Renovaciones próximas"
          value={String(renewals.length)}
          sub="Paquetes que vencen en 30 días"
          icon={AlertTriangle}
          borderColor={renewals.length > 0 ? "rose" : "charcoal"}
        />
      </section>

      {/* Charts + Quick access + Alerts */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* Occupancy chart */}
          <article className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <h2 className="mb-1 text-[15px] font-bold text-[#1a1a1a]">Ocupación de cupos</h2>
            <p className="mb-5 text-xs text-[#94a3b8]">Cupos usados vs contratados por empresa.</p>
            <div className="flex items-center gap-8">
              <RingChart pct={ocupacionPct} label="Global" />
              <div className="min-w-0 flex-1 space-y-3">
                {empresas.slice(0, 6).map((e) => (
                  <CompanyBar
                    key={e.id}
                    nombre={e.nombre}
                    usados={e.asientos_usados}
                    contratados={e.asientos_contratados}
                  />
                ))}
                {empresas.length === 0 && (
                  <p className="text-xs text-[#94a3b8]">Sin empresas registradas aún.</p>
                )}
              </div>
            </div>
          </article>

          {/* Quick access */}
          <article className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <h2 className="mb-1 text-[15px] font-bold text-[#1a1a1a]">Acceso rápido</h2>
            <p className="mb-4 text-xs text-[#94a3b8]">Secciones principales del portal.</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <QuickLink href="/superadmin/empresas" label="Empresas" description="Alta, cupos y estado de clientes" Icon={Building2} iconCls="bg-[#fff5ed] text-[#E8761A]" />
              <QuickLink href="/superadmin/paquetes" label="Paquetes" description="Catálogo de cursos corporativos" Icon={Package} iconCls="bg-violet-50 text-violet-600" />
              <QuickLink href="/superadmin/reportes" label="Reportes globales" description="Avance, sync y alertas operativas" Icon={BarChart3} iconCls="bg-amber-50 text-amber-600" />
              <QuickLink href="/superadmin/integracion" label="Integración" description="Estado del bridge con WordPress" Icon={Plug} iconCls="bg-[#fff5ed] text-[#E8761A]" />
              <QuickLink href="/superadmin/accesos" label="Accesos" description="Usuarios RH y sesiones activas" Icon={ShieldCheck} iconCls="bg-slate-100 text-slate-500" />
            </div>
          </article>
        </div>

        <div className="space-y-5">
          {/* Renovaciones */}
          <article className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#1a1a1a]">Renovaciones próximas</h2>
                <p className="text-xs text-[#94a3b8]">Paquetes que vencen en 30 días.</p>
              </div>
              <Link href="/superadmin/reportes" className="text-xs font-semibold text-[#E8761A] transition hover:text-[#C45F0A]">
                Ver todo →
              </Link>
            </div>
            {renewals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-xs text-[#94a3b8]">
                Sin alertas de vencimiento.
              </div>
            ) : (
              <div className="space-y-2">
                {renewals.slice(0, 5).map(({ empresa, days }) => {
                  const badge =
                    days < 0 ? "bg-rose-100 text-rose-700"
                    : days <= 7 ? "bg-amber-100 text-amber-700"
                    : "bg-[#fff5ed] text-[#C45F0A]"
                  return (
                    <div key={empresa.id} className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1a1a1a]">{empresa.nombre}</p>
                        <p className="truncate text-[11px] text-[#94a3b8]">{empresa.paquetes[0]?.paquete.nombre ?? "Sin paquete"}</p>
                      </div>
                      <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
                        {days < 0 ? "Vencido" : days === 0 ? "Hoy" : `${days}d`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </article>

          {/* Empresas recientes */}
          <article className="rounded-xl border border-[#f0f0f0] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#1a1a1a]">Empresas recientes</h2>
                <p className="text-xs text-[#94a3b8]">Últimas altas en el portal.</p>
              </div>
              <Link href="/superadmin/empresas" className="text-xs font-semibold text-[#E8761A] transition hover:text-[#C45F0A]">
                Ver todas →
              </Link>
            </div>
            {empresas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-xs text-[#94a3b8]">
                Aún no hay empresas registradas.
              </div>
            ) : (
              <div className="space-y-2">
                {empresas.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1a1a1a]">{e.nombre}</p>
                      <p className="text-[11px] text-[#94a3b8]">{formatDate(e.created_at)}</p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${e.activo ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f1f5f9] text-[#475569]"}`}>
                      {e.activo ? "Activa" : "Suspendida"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
