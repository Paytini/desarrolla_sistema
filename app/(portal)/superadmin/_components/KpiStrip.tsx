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
    },
    {
      value: String(totalEmpleadosActivos),
      label: "Empleados",
      sub: "con acceso al LMS",
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
    <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
      {metrics.map((m, i) => (
        <div key={m.label} className="flex items-start gap-10">
          <div>
            <p
              className="text-[52px] font-bold leading-none tracking-tight"
              style={{ color: m.alert ? "#f43f5e" : "#130303" }}
            >
              {m.value}
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {m.label}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-300">{m.sub}</p>
          </div>
          {i < metrics.length - 1 && (
            <div className="mt-3 h-14 w-px shrink-0 bg-slate-100" />
          )}
        </div>
      ))}
    </div>
  )
}
