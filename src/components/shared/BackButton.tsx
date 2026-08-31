import { ArrowLeft } from "lucide-react"
import Link from "next/link"

type BackButtonProps = {
  href: string
  label: string
}

export function BackButton({ href, label }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-700"
    >
      <ArrowLeft size={12} strokeWidth={2.5} />
      {label}
    </Link>
  )
}
