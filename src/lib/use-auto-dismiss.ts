"use client"

import { useEffect, useState } from "react"

// Starts open, auto-closes after delayMs unless dismissed sooner via the returned setter.
export function useAutoDismiss(delayMs: number = 3000) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setOpen(false), delayMs)
    return () => clearTimeout(timer)
  }, [open, delayMs])

  return [open, setOpen] as const
}
