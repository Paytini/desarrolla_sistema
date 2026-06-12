"use client"

import { useState, type ReactNode } from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@mui/material"
import { alpha, type Theme } from "@mui/material/styles"
import type { SystemStyleObject } from "@mui/system"

type ConfirmIconButtonTone = "brand" | "outline" | "outline-destructive"

type ConfirmIconButtonProps = {
  icon: ReactNode
  label: string
  tone?: ConfirmIconButtonTone
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  action: (formData: FormData) => void | Promise<void>
  hiddenFields?: Record<string, string | number>
}

// SystemStyleObject (not SxProps) on purpose: SxProps<Theme> can itself be an array,
// which breaks the sx={[{...}, toneSx[tone]]} array-merge syntax on the IconButton below.
const toneSx: Record<ConfirmIconButtonTone, SystemStyleObject<Theme>> = {
  brand: {
    bgcolor: "primary.main",
    color: "primary.contrastText",
    "&:hover": { bgcolor: "primary.dark" },
  },
  outline: {
    border: "1px solid",
    borderColor: "divider",
    color: "text.secondary",
    "&:hover": { bgcolor: "action.hover" },
  },
  "outline-destructive": {
    border: "1px solid",
    borderColor: (theme) => alpha(theme.palette.error.main, 0.3),
    color: "error.main",
    "&:hover": { bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) },
  },
}

export function ConfirmIconButton({
  icon,
  label,
  tone = "outline",
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  action,
  hiddenFields,
}: ConfirmIconButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          size="small"
          onClick={() => setOpen(true)}
          sx={[{ width: 32, height: 32 }, toneSx[tone]]}
        >
          {icon}
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{cancelLabel}</Button>
          <form action={action}>
            {hiddenFields &&
              Object.entries(hiddenFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
            <Button
              type="submit"
              variant="contained"
              color={tone === "outline-destructive" ? "error" : "primary"}
              onClick={() => setOpen(false)}
            >
              {confirmLabel}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  )
}
