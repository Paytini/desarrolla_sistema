"use client"

import { useState, type ReactNode } from "react"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { X } from "lucide-react"

type DismissibleAlertProps = {
  icon: ReactNode
  children: ReactNode
  variant?: "default" | "destructive"
  className?: string
}

/** Banner de éxito/error que el usuario puede cerrar con el botón "X". */
export function DismissibleAlert({ icon, children, variant, className }: DismissibleAlertProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  return (
    <Alert variant={variant} className={className}>
      {icon}
      <AlertDescription>{children}</AlertDescription>
      <AlertAction>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar aviso"
          className="rounded-md p-1 text-current/60 transition-colors hover:bg-current/10 hover:text-current"
        >
          <X size={14} />
        </button>
      </AlertAction>
    </Alert>
  )
}
