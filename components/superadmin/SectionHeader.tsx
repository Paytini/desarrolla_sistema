import { type ReactNode } from "react"

interface SectionHeaderProps {
  title: string
  description?: string
  breadcrumb?: string
  action?: ReactNode
}

export function SectionHeader({ title, description, breadcrumb, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {breadcrumb && (
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {breadcrumb}
          </p>
        )}
        <h2 className="text-[15px] font-medium leading-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
