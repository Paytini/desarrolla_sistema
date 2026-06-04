import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
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
  blue:    { bar: "#1a4f8a", icon: "#1a4f8a",  iconBg: "rgba(26,79,138,0.1)" },
  green:   { bar: "#22c55e", icon: "#22c55e",  iconBg: "rgba(34,197,94,0.1)" },
}

export default function KpiCard({ label, value, sub, icon: Icon, borderColor = "orange" }: KpiCardProps) {
  const { bar, icon: iconColor, iconBg } = accentMap[borderColor]
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 top-0 h-[3px] w-full" style={{ background: bar }} />
      <CardContent className="px-5 py-5 pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-[34px] font-bold leading-none tracking-tight text-foreground">
              {value}
            </p>
            {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
          </div>
          {Icon && (
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: iconBg }}
            >
              <Icon size={18} strokeWidth={2} style={{ color: iconColor }} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
