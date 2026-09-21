import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

export function SortableColumnHeader({
  href,
  label,
  direction,
}: {
  href: string
  label: string
  direction: "asc" | "desc" | null
}) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown
  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-slate-700">
      {label}
      <Icon size={12} className={direction ? "text-slate-700" : "text-slate-400"} />
    </Link>
  )
}
