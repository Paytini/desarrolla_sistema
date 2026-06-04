import { StatCard } from "@/components/superadmin/StatCard"

interface KpiStripProps {
  empresasActivas: number
  totalEmpresas: number
  totalEmpleadosActivos: number
  ocupacionPct: number
  totalUsados: number
  totalContratados: number
  renovacionesCount: number
}

export function KpiStrip({
  empresasActivas,
  totalEmpresas,
  totalEmpleadosActivos,
  ocupacionPct,
  totalUsados,
  totalContratados,
  renovacionesCount,
}: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
      <StatCard
        label="Empresas activas"
        value={empresasActivas}
        sub={`de ${totalEmpresas} registradas`}
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
        value={renovacionesCount}
        sub="vencen en los próximos 30 d"
        alert={renovacionesCount > 0}
      />
    </div>
  )
}
