import type { ReactNode } from "react"

type EmptyStateProps = {
  message: string
  description?: string
  icon?: ReactNode
  className?: string
}

export default function EmptyState({ message, description, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center ${className}`}
    >
      {icon}
      <p className={icon ? "text-sm font-medium text-slate-600" : "text-sm text-slate-500"}>
        {message}
      </p>
      {description ? <p className="max-w-md text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}
