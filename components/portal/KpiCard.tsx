import type { LucideIcon } from "lucide-react"

type KpiBorderColor = "orange" | "charcoal" | "amber" | "rose" | "blue" | "green"

type KpiCardProps = {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
}

const borderMap: Record<KpiBorderColor, string> = {
  orange:  "border-l-[#E8761A]",
  charcoal:"border-l-[#1a1a1a]",
  amber:   "border-l-[#f59e0b]",
  rose:    "border-l-[#f43f5e]",
  blue:    "border-l-[#3b82f6]",
  green:   "border-l-[#22c55e]",
}

const iconOpacityMap: Record<KpiBorderColor, string> = {
  orange:  "text-[#E8761A]",
  charcoal:"text-[#1a1a1a]",
  amber:   "text-[#f59e0b]",
  rose:    "text-[#f43f5e]",
  blue:    "text-[#3b82f6]",
  green:   "text-[#22c55e]",
}

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  borderColor = "orange",
}: KpiCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-xl border-l-4 bg-white p-5 shadow-none ${borderMap[borderColor]}`}
      style={{ border: "1px solid #f0f0f0", borderLeftWidth: "4px" }}
    >
      <p className="text-[11px] font-700 uppercase tracking-[0.6px] text-[#94a3b8]">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none text-[#1a1a1a]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#64748b]">{sub}</p>}
      {Icon && (
        <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.08] ${iconOpacityMap[borderColor]}`}>
          <Icon size={56} strokeWidth={1.5} />
        </div>
      )}
    </article>
  )
}
