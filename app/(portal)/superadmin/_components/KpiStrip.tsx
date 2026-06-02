// app/(portal)/superadmin/_components/KpiStrip.tsx

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
  const metrics = [
    {
      value: String(empresasActivas),
      label: "Empresas activas",
      sub: `de ${totalEmpresas} registradas`,
      alert: false,
    },
    {
      value: String(totalEmpleadosActivos),
      label: "Empleados",
      sub: "con acceso al LMS",
      alert: false,
    },
    {
      value: `${ocupacionPct}%`,
      label: "Ocupación",
      sub: `${totalUsados} de ${totalContratados} cupos`,
      alert: ocupacionPct >= 90,
    },
    {
      value: String(renovacionesCount),
      label: "Renovaciones próximas",
      sub: "paquetes en 30 días",
      alert: renovacionesCount > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
      {metrics.map((m) => (
        <div key={m.label} className="px-6 py-5">
          <p
            className="text-[42px] font-bold leading-none tracking-tight"
            style={{ color: m.alert ? "#f43f5e" : "#130303" }}
          >
            {m.value}
          </p>
          <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-slate-400">
            {m.label}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-300">{m.sub}</p>
        </div>
      ))}
    </div>
  )
}
