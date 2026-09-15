"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

type CollapsibleSectionProps = {
  title: string
  count?: ReactNode
  action?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export default function CollapsibleSection({
  title,
  count,
  action,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-lg bg-white p-5">
      <div className={`flex items-center justify-between gap-3 ${open ? "mb-4" : ""}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center gap-2 text-base font-semibold text-slate-950"
        >
          {open ? (
            <ChevronUp size={18} className="shrink-0 text-slate-400" />
          ) : (
            <ChevronDown size={18} className="shrink-0 text-slate-400" />
          )}
          {title}
          {count !== undefined ? (
            <span className="text-sm font-normal text-slate-400">{count}</span>
          ) : null}
        </button>
        {action}
      </div>
      {open ? children : null}
    </section>
  )
}
