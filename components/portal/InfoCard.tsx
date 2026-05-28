import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type Accent = "teal" | "orange" | "amber" | "violet" | "slate" | "rose"

type InfoCardProps = {
  title: string
  description: string
  accent?: Accent
  value?: string
  icon?: LucideIcon
  children?: ReactNode
}

const iconStyle: Record<Accent, string> = {
  teal:   "bg-teal-50 text-teal-600",
  orange: "bg-[#fff5ed] text-[#E8761A]",
  amber:  "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  slate:  "bg-slate-100 text-slate-500",
  rose:   "bg-rose-50 text-rose-600",
}

export default function InfoCard({
  title,
  description,
  accent = "slate",
  value,
  icon: Icon,
  children,
}: InfoCardProps) {
  return (
    <article className="rounded-xl border border-[#f0f0f0] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-snug text-[#64748b]">{title}</p>
        {Icon && (
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconStyle[accent]}`}>
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
      </div>
      {value !== undefined && (
        <p className="mt-3 text-[2rem] font-bold leading-none tracking-tight text-[#1a1a1a]">
          {value}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-[#94a3b8]">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  )
}
