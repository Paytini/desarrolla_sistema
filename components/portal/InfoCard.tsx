import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type Accent = "teal" | "amber" | "violet" | "slate" | "rose"

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
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-snug text-slate-500">{title}</p>
        {Icon && (
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconStyle[accent]}`}>
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
      </div>
      {value !== undefined && (
        <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-slate-950">
          {value}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  )
}
