import { type ReactNode } from "react"

interface PageHeaderProps {
  breadcrumb: string
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ breadcrumb, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {breadcrumb}
        </p>
        <h1 className="mt-0.5 text-[22px] font-semibold leading-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  )
}
