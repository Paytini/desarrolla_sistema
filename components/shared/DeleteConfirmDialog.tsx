"use client"

import { useFormStatus } from "react-dom"
import { alpha } from "@mui/material/styles"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"
import { Trash2 } from "lucide-react"

type DeleteConfirmDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
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

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="contained"
      color="error"
      disabled={pending}
      startIcon={pending ? <CircularProgress size={14} color="inherit" /> : undefined}
      sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" } }}
    >
      {pending ? "Eliminando…" : label}
    </Button>
  )
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Sí, eliminar",
  cancelLabel = "Cancelar",
  action,
  hiddenFields,
}: DeleteConfirmDialogProps) {
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
      <DialogTitle sx={{ pb: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
              color: "error.main",
            }}
          >
            <Trash2 size={16} strokeWidth={2} />
          </Box>
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "error.main",
            }}
          >
            Confirmar eliminación
          </Typography>
        </Box>
        {title}
      </DialogTitle>
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
          <ConfirmButton label={confirmLabel} />
        </form>
      </DialogActions>
    </Dialog>
  )
}
