import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  alert?: boolean
}

export function StatCard({ label, value, sub, alert = false }: StatCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden border-t-[3px]",
      alert ? "border-t-destructive" : "border-t-primary"
    )}>
      <CardContent className="px-5 py-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className={cn(
          "text-[36px] font-semibold leading-none tabular-nums tracking-tight",
          alert ? "text-destructive" : "text-foreground"
        )}>
          {value}
        </p>
        {sub && (
          <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  )
}
