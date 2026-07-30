"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"

type CancelConsultingRequestButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  requestId: number
  areaLabel: string
  returnTo?: string
}

export function CancelConsultingRequestButton({
  action,
  requestId,
  areaLabel,
  returnTo,
}: CancelConsultingRequestButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={() => setOpen(true)}
        sx={{ height: 28, px: 1.5, fontSize: 12, flexShrink: 0 }}
      >
        Cancelar
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", border: "1px solid", borderColor: "divider" } },
        }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "error.main",
              mb: 0.75,
              display: "block",
            }}
          >
            Confirmar cancelación
          </Typography>
          ¿Cancelar la consultoría de {areaLabel}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción marcará la solicitud como cancelada. Tendrás que agendar una nueva si cambias de
            opinión.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Volver
          </Button>
          <form action={action}>
            <input type="hidden" name="request_id" value={requestId} />
            {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
            <Button
              type="submit"
              variant="contained"
              color="error"
              onClick={() => setOpen(false)}
              sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" } }}
            >
              Sí, cancelar
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  )
}
