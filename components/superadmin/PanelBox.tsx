import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PanelBoxProps {
  title: string
  description?: string
  count?: number | string
  action?: ReactNode
  children: ReactNode
  noPadding?: boolean
}

export function PanelBox({ title, description, count, action, children, noPadding }: PanelBoxProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="text-[14px] font-medium leading-tight text-foreground font-[family-name:var(--font-heading)]">{title}</p>
            {count !== undefined && (
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {count}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className={cn("p-0")}>
        {children}
      </CardContent>
    </Card>
  )
}
