"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import { SubmitButton } from "@/components/shared/SubmitButton"

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: "primary" | "error"
  action: (formData: FormData) => void | Promise<void>
  hiddenFields?: Record<string, string | number>
}

function CancelButton({ onClose, label }: { onClose: () => void; label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="button" variant="outlined" disabled={pending} onClick={onClose}>
      {label}
    </Button>
  )
}

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmColor = "primary",
  action,
  hiddenFields,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: "16px", border: "1px solid", borderColor: "divider" } },
      }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <form action={action} style={{ display: "flex", gap: 8 }}>
          {hiddenFields &&
            Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          <CancelButton onClose={onClose} label={cancelLabel} />
          <SubmitButton
            variant="contained"
            color={confirmColor}
            sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" } }}
          >
            {confirmLabel}
          </SubmitButton>
        </form>
      </DialogActions>
    </Dialog>
  )
}
