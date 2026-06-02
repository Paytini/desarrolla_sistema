// app/(portal)/superadmin/_components/KpiStrip.tsx
import { Card, CardContent } from "@/components/ui/card"
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
  iconCls: string
}

function KpiCardItem({ label, value, sub, Icon, iconCls }: KpiCardItemProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </div>
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
        </div>
      </CardContent>
    </Card>
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
        sub={`${totalEmpresas} registrada${totalEmpresas !== 1 ? "s" : ""} en total`}
        Icon={Building2}
        iconCls="bg-[#fff5ed] text-[#E8761A]"
      />
      <KpiCardItem
        label="Empleados activos"
        value={String(totalEmpleadosActivos)}
        sub="Colaboradores con acceso al LMS"
        Icon={Users}
        iconCls="bg-slate-100 text-slate-600"
      />
      <KpiCardItem
        label="Ocupación global"
        value={`${ocupacionPct}%`}
        sub={`${totalUsados} de ${totalContratados} cupos en uso`}
        Icon={BarChart3}
        iconCls="bg-amber-50 text-amber-600"
      />
      <KpiCardItem
        label="Renovaciones próximas"
        value={String(renovacionesCount)}
        sub="Paquetes que vencen en 30 días"
        Icon={AlertTriangle}
        iconCls={
          renovacionesCount > 0
            ? "bg-rose-50 text-rose-500"
            : "bg-slate-100 text-slate-500"
        }
      />
    </div>
  )
}
