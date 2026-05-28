type BadgeVariant = "green" | "amber" | "red" | "slate" | "blue" | "orange"

type StatusBadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

const styles: Record<BadgeVariant, string> = {
  green:  "bg-[#dcfce7] text-[#16a34a]",
  amber:  "bg-[#fef3c7] text-[#d97706]",
  red:    "bg-[#fce7e7] text-[#dc2626]",
  slate:  "bg-[#f1f5f9] text-[#475569]",
  blue:   "bg-[#eff6ff] text-[#2563eb]",
  orange: "bg-[#fff5ed] text-[#C45F0A]",
}

const dotColors: Record<BadgeVariant, string> = {
  green:  "bg-[#16a34a]",
  amber:  "bg-[#d97706]",
  red:    "bg-[#dc2626]",
  slate:  "bg-[#94a3b8]",
  blue:   "bg-[#2563eb]",
  orange: "bg-[#E8761A]",
}

export default function StatusBadge({ variant, children, dot }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${styles[variant]}`}
    >
      {dot && (
        <span className={`size-[5px] rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  )
}
