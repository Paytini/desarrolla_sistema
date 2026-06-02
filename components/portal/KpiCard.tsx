import type { LucideIcon } from "lucide-react"

type KpiBorderColor = "orange" | "charcoal" | "amber" | "rose" | "blue" | "green"

type KpiCardProps = {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
}

const accentMap: Record<KpiBorderColor, { bar: string; icon: string; iconBg: string }> = {
  orange:  { bar: "#F5853F", icon: "#F5853F",  iconBg: "rgba(245,133,63,0.1)" },
  charcoal:{ bar: "#000022", icon: "#000022",  iconBg: "rgba(0,0,34,0.07)" },
  amber:   { bar: "#f59e0b", icon: "#f59e0b",  iconBg: "rgba(245,158,11,0.1)" },
  rose:    { bar: "#f43f5e", icon: "#f43f5e",  iconBg: "rgba(244,63,94,0.1)" },
  blue:    { bar: "#3b82f6", icon: "#3b82f6",  iconBg: "rgba(59,130,246,0.1)" },
  green:   { bar: "#22c55e", icon: "#22c55e",  iconBg: "rgba(34,197,94,0.1)" },
}

export default function KpiCard({ label, value, sub, icon: Icon, borderColor = "orange" }: KpiCardProps) {
  const { bar, icon: iconColor, iconBg } = accentMap[borderColor]
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white p-5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,34,0.06)", border: "1px solid rgba(0,0,34,0.07)" }}
    >
      <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-2xl" style={{ background: bar }} />
      <div className="flex items-start justify-between pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-slate-400">{label}</p>
          <p className="mt-2 text-[34px] font-bold leading-none tracking-tight" style={{ color: "#130303" }}>{value}</p>
          {sub && <p className="mt-2 text-[12px] text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: iconBg }}>
            <Icon size={18} strokeWidth={2} style={{ color: iconColor }} />
          </span>
        )}
      </div>
    </div>
  )
}
