import type { ReactNode } from "react"

type InfoCardProps = {
  title: string
  description: string
  accent?: "teal" | "amber" | "violet" | "slate"
  value?: string
  children?: ReactNode
}

const accentStyles = {
  teal: "border-teal-200 bg-teal-50/70",
  amber: "border-amber-200 bg-amber-50/70",
  violet: "border-violet-200 bg-violet-50/70",
  slate: "border-slate-200 bg-white",
}

export default function InfoCard({
  title,
  description,
  accent = "slate",
  value,
  children,
}: InfoCardProps) {
  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${accentStyles[accent]}`}>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {value ? (
          <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        ) : null}
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  )
}
