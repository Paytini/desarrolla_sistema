import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ActivityFeed } from "@/components/superadmin/ActivityFeed"
import { QuickActions } from "@/components/superadmin/QuickActions"
import { StatCard } from "@/components/superadmin/StatCard"
import { OcupacionCard } from "./_components/OcupacionCard"
import { RenovacionesTable } from "./_components/RenovacionesTable"

const DAY_MS = 1000 * 60 * 60 * 24

export default async function SuperadminDashboardPage() {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const [{ empresas }, recentEvents] = await Promise.all([
    getSuperadminEmpresasSnapshot(),
    prisma.auditoriaEvento.findMany({
      orderBy: { created_at: "desc" },
      take: 12,
      select: {
        id: true,
        actor_nombre: true,
        actor_rol: true,
        accion: true,
        entidad_tipo: true,
        resumen: true,
        created_at: true,
      },
    }),
  ])

  const now = Date.now()
  const empresasActivas = empresas.filter((e) => e.activo).length
  const totalEmpleadosActivos = empresas.reduce(
    (s, e) => s + e.empleados.filter((emp) => emp.activo).length,
    0
  )
  const totalContratados = empresas.reduce((s, e) => s + e.asientos_contratados, 0)
  const totalUsados = empresas.reduce((s, e) => s + e.asientos_usados, 0)
  const ocupacionPct = totalContratados
    ? Math.round((totalUsados / totalContratados) * 100)
    : 0

  const renewals = empresas
    .filter((e) => {
      const exp = e.paquetes[0]?.fecha_vencimiento
      if (!exp) return false
      return Math.floor((new Date(exp).getTime() - now) / DAY_MS) <= 30
    })
    .map((e) => ({
      empresa: e,
      days: Math.floor(
        (new Date(e.paquetes[0]!.fecha_vencimiento as Date).getTime() - now) / DAY_MS
      ),
    }))
    .sort((a, b) => a.days - b.days)

  const nombre = session.user.nombre as string
  const fecha = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Panel de control
          </p>
          <h1 className="mt-0.5 text-[22px] font-semibold leading-tight text-foreground">
            {nombre}
          </h1>
          <p className="mt-0.5 text-[13px] capitalize text-muted-foreground">
            {fecha}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          SuperAdmin
        </span>
      </div>

      {/* KPI row — 4 separate stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Empresas activas"
          value={empresasActivas}
          sub={`de ${empresas.length} registradas`}
        />
        <StatCard
          label="Empleados con acceso"
          value={totalEmpleadosActivos}
          sub="usuarios activos en LMS"
        />
        <StatCard
          label="Ocupación global"
          value={`${ocupacionPct}%`}
          sub={`${totalUsados} de ${totalContratados} cupos`}
          alert={ocupacionPct >= 90}
        />
        <StatCard
          label="Renovaciones próximas"
          value={renewals.length}
          sub="vencen en 30 días"
          alert={renewals.length > 0}
        />
      </div>

      {/* Main 2-column grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <ActivityFeed items={recentEvents} />
        <QuickActions />
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <OcupacionCard ocupacionPct={ocupacionPct} empresas={empresas} />
        <RenovacionesTable renewals={renewals} />
      </div>
    </div>
  )
}
