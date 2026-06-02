// app/(portal)/superadmin/_components/KpiStrip.tsx
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Users,
  type LucideIcon,
} from "lucide-react"

interface KpiCardItemProps {
  label: string
  value: string
  sub: string
  Icon: LucideIcon
  accent: string
  iconBg: string
}

function KpiCardItem({ label, value, sub, Icon, accent, iconBg }: KpiCardItemProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white p-5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,34,0.06), 0 1px 2px rgba(0,0,34,0.04)" }}
    >
      {/* Accent bar top */}
      <div
        className="absolute left-0 top-0 h-[3px] rounded-tl-2xl rounded-tr-2xl"
        style={{ background: accent, width: "100%" }}
      />

      <div className="flex items-start justify-between pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-slate-400">
            {label}
          </p>
          <p
            className="mt-2 text-[36px] font-bold leading-none tracking-tight"
            style={{ color: "#130303" }}
          >
            {value}
          </p>
          <p className="mt-2 text-[12px] text-slate-400">{sub}</p>
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          <Icon size={18} strokeWidth={2} style={{ color: accent }} />
        </span>
      </div>
    </div>
  )
}

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCardItem
        label="Empresas activas"
        value={String(empresasActivas)}
        sub={`${totalEmpresas} registradas en total`}
        Icon={Building2}
        accent="#F5853F"
        iconBg="rgba(245,133,63,0.1)"
      />
      <KpiCardItem
        label="Empleados activos"
        value={String(totalEmpleadosActivos)}
        sub="Con acceso al LMS"
        Icon={Users}
        accent="#000022"
        iconBg="rgba(0,0,34,0.07)"
      />
      <KpiCardItem
        label="Ocupación global"
        value={`${ocupacionPct}%`}
        sub={`${totalUsados} de ${totalContratados} cupos`}
        Icon={BarChart3}
        accent="#f59e0b"
        iconBg="rgba(245,158,11,0.1)"
      />
      <KpiCardItem
        label="Renovaciones"
        value={String(renovacionesCount)}
        sub="Paquetes por vencer en 30 días"
        Icon={AlertTriangle}
        accent={renovacionesCount > 0 ? "#f43f5e" : "#94a3b8"}
        iconBg={renovacionesCount > 0 ? "rgba(244,63,94,0.1)" : "rgba(148,163,184,0.1)"}
      />
    </div>
  )
}
