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
import SuperadminSearchBar from "@/components/portal/SuperadminSearchBar"

const DAY_MS = 1000 * 60 * 60 * 24

// ── Pure-SVG ring chart (zero JS cost, works in RSC) ─────────────────
function RingChart({ pct, label }: { pct: number; label: string }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const color = pct >= 90 ? "#f43f5e" : pct >= 70 ? "#f59e0b" : "#0d9488"

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
  const barColor = pct >= 90 ? "bg-rose-400" : pct >= 70 ? "bg-amber-400" : "bg-teal-500"

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
      className="group flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
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

// ── KPI card ──────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  Icon,
  iconCls,
}: {
  label: string
  value: string
  sub: string
  Icon: React.FC<{ size?: number; strokeWidth?: number }>
  iconCls: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
          <Icon size={15} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{sub}</p>
    </article>
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
    <div className="space-y-7">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">
              SuperAdmin · Portal Desarrolla360
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Bienvenido, {nombre}!
            </h1>
            <p className="text-sm text-slate-400">Vista ejecutiva del portal empresarial.</p>
          </div>
          <SuperadminSearchBar />
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Empresas activas"
          value={String(empresasActivas)}
          sub={`${empresas.length} registrada${empresas.length !== 1 ? "s" : ""} en total`}
          Icon={Building2}
          iconCls="bg-teal-50 text-teal-600"
        />
        <KpiCard
          label="Empleados activos"
          value={String(totalEmpleadosActivos)}
          sub="Colaboradores con acceso al LMS"
          Icon={Users}
          iconCls="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Ocupación global"
          value={`${ocupacionPct}%`}
          sub={`${totalUsados} de ${totalContratados} cupos en uso`}
          Icon={BarChart3}
          iconCls="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Renovaciones próximas"
          value={String(renewals.length)}
          sub="Paquetes que vencen en 30 días"
          Icon={AlertTriangle}
          iconCls={renewals.length > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-400"}
        />
      </section>

      {/* ── Charts + Quick access + Alerts ───────────────────────────── */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* Left: Ocupación chart + Quick access */}
        <div className="space-y-6">
          {/* Occupancy chart */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-5 space-y-0.5">
              <h2 className="text-[15px] font-semibold text-slate-950">Ocupación de cupos</h2>
              <p className="text-xs text-slate-400">
                Cupos usados vs contratados por empresa.
              </p>
            </div>
            <div className="flex items-center gap-8">
              <RingChart pct={ocupacionPct} label="Global" />
              <div className="flex-1 space-y-3 min-w-0">
                {empresas.slice(0, 6).map((e) => (
                  <CompanyBar
                    key={e.id}
                    nombre={e.nombre}
                    usados={e.asientos_usados}
                    contratados={e.asientos_contratados}
                  />
                ))}
                {empresas.length === 0 && (
                  <p className="text-xs text-slate-400">Sin empresas registradas aún.</p>
                )}
              </div>
            </div>
          </article>

          {/* Quick access */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 space-y-0.5">
              <h2 className="text-[15px] font-semibold text-slate-950">Acceso rápido</h2>
              <p className="text-xs text-slate-400">Secciones principales del portal.</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <QuickLink
                href="/superadmin/empresas"
                label="Empresas"
                description="Alta, cupos y estado de clientes"
                Icon={Building2}
                iconCls="bg-teal-50 text-teal-600"
              />
              <QuickLink
                href="/superadmin/paquetes"
                label="Paquetes"
                description="Catálogo de cursos corporativos"
                Icon={Package}
                iconCls="bg-violet-50 text-violet-600"
              />
              <QuickLink
                href="/superadmin/reportes"
                label="Reportes globales"
                description="Avance, sync y alertas operativas"
                Icon={BarChart3}
                iconCls="bg-amber-50 text-amber-600"
              />
              <QuickLink
                href="/superadmin/integracion"
                label="Integración"
                description="Estado del bridge con WordPress"
                Icon={Plug}
                iconCls="bg-orange-50 text-orange-600"
              />
              <QuickLink
                href="/superadmin/accesos"
                label="Accesos"
                description="Usuarios RH y sesiones activas"
                Icon={ShieldCheck}
                iconCls="bg-slate-100 text-slate-500"
              />
            </div>
          </article>
        </div>

        {/* Right: Alerts + Recent companies */}
        <div className="space-y-5">
          {/* Renovaciones */}
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-[15px] font-semibold text-slate-950">Renovaciones próximas</h2>
                <p className="text-xs text-slate-400">Paquetes que vencen en 30 días.</p>
              </div>
              <Link
                href="/superadmin/reportes"
                className="text-xs font-semibold text-teal-600 transition hover:text-teal-800"
              >
                Ver todo →
              </Link>
            </div>

            {renewals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                Sin alertas de vencimiento.
              </div>
            ) : (
              <div className="space-y-2">
                {renewals.slice(0, 5).map(({ empresa, days }) => {
                  const badge =
                    days < 0
                      ? "bg-rose-100 text-rose-700"
                      : days <= 7
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                  return (
                    <div
                      key={empresa.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {empresa.nombre}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {empresa.paquetes[0]?.paquete.nombre ?? "Sin paquete"}
                        </p>
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
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-[15px] font-semibold text-slate-950">Empresas recientes</h2>
                <p className="text-xs text-slate-400">Últimas altas en el portal.</p>
              </div>
              <Link
                href="/superadmin/empresas"
                className="text-xs font-semibold text-teal-600 transition hover:text-teal-800"
              >
                Ver todas →
              </Link>
            </div>

            {empresas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                Aún no hay empresas registradas.
              </div>
            ) : (
              <div className="space-y-2">
                {empresas.slice(0, 5).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{e.nombre}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(e.created_at)}</p>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        e.activo ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
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
