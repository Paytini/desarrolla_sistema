"use client"

import { useState, type ReactNode } from "react"
import { Alert, Collapse, IconButton } from "@mui/material"
import { X } from "lucide-react"

type DismissibleAlertProps = {
  icon: ReactNode
  children: ReactNode
  severity: "success" | "error"
}

export function DismissibleAlert({ icon, children, severity }: DismissibleAlertProps) {
  const [open, setOpen] = useState(true)

  return (
    <Collapse in={open}>
      <Alert
        icon={icon}
        severity={severity}
        action={
          <IconButton size="small" aria-label="Cerrar aviso" onClick={() => setOpen(false)}>
            <X size={14} />
          </IconButton>
        }
        sx={{ alignItems: "center" }}
      >
        {children}
      </Alert>
    </Collapse>
  )
}
