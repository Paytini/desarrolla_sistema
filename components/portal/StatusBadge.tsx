import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type BadgeVariant = "green" | "amber" | "red" | "slate" | "blue" | "orange"

type StatusBadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  green:  "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  amber:  "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
  red:    "bg-red-100   text-red-700   border-red-200   hover:bg-red-100",
  slate:  "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
  blue:   "bg-blue-100  text-blue-700  border-blue-200  hover:bg-blue-100",
  orange: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
}

const dotClasses: Record<BadgeVariant, string> = {
  green:  "bg-green-600",
  amber:  "bg-amber-600",
  red:    "bg-red-600",
  slate:  "bg-slate-400",
  blue:   "bg-blue-600",
  orange: "bg-orange-500",
}

export default function StatusBadge({ variant, children, dot }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full text-[11.5px] font-semibold", variantClasses[variant])}
    >
      {dot && <span className={cn("size-[5px] rounded-full", dotClasses[variant])} />}
      {children}
    </Badge>
  )
}
