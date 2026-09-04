"use client"

import type { ReactNode } from "react"
import type { SxProps, Theme } from "@mui/material"
import { Alert, Collapse, IconButton } from "@mui/material"
import { AlertCircle, CheckCircle2, X } from "lucide-react"
import { useAutoDismiss } from "@/lib/use-auto-dismiss"
import { green } from "@/lib/theme-tokens"

type DismissibleAlertProps = {
  icon?: ReactNode
  children: ReactNode
  severity: "success" | "error"
  sx?: SxProps<Theme>
}

const SEVERITY_SX = {
  success: {
    borderRadius: 2,
    border: `1px solid ${green[200]}`,
    bgcolor: green[50],
    color: green[900],
  },
  error: { borderRadius: 2 },
} as const

const DEFAULT_ICON = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
} as const

export function DismissibleAlert({ icon, children, severity, sx }: DismissibleAlertProps) {
  const [open, setOpen] = useAutoDismiss()

  return (
    <Collapse in={open}>
      <Alert
        icon={icon ?? DEFAULT_ICON[severity]}
        severity={severity}
        action={
          <IconButton size="small" aria-label="Cerrar aviso" onClick={() => setOpen(false)}>
            <X size={14} />
          </IconButton>
        }
        sx={{ alignItems: "center", ...SEVERITY_SX[severity], ...sx }}
      >
        {children}
      </Alert>
    </Collapse>
  )
}
