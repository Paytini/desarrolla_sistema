"use client"

import { useState } from "react"
import { X } from "lucide-react"
import Alert from "@mui/material/Alert"
import AlertTitle from "@mui/material/AlertTitle"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"

type StatusNoticeProps = {
  tone: "success" | "error"
  message: string
  title?: string
}

export default function StatusNotice({ tone, message, title }: StatusNoticeProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  if (tone === "error") {
    return (
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "16px", border: "1px solid", borderColor: "divider" },
          },
        }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Typography
            sx={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "error.main",
              mb: 0.75,
              display: "block",
            }}
          >
            Error detectado
          </Typography>
          {title ?? "No fue posible completar la acción"}
        </DialogTitle>

        <DialogContent>
          <DialogContentText sx={{ maxHeight: 240, overflowY: "auto", lineHeight: 1.6 }}>
            {message}
          </DialogContentText>
          <Box
            sx={{
              mt: 2,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
              px: 2,
              py: 1.5,
              fontSize: "12px",
              lineHeight: 1.5,
              color: "text.secondary",
            }}
          >
            No se aplicaron cambios inseguros. Si el error menciona WordPress o Tutor LMS,
            revisa que el usuario o curso sigan existiendo y vuelve a intentar la acción.
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setOpen(false)}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Alert
      severity="success"
      sx={{
        border: "1px solid #bbf7d0",
        bgcolor: "#f0fdf4",
        color: "#15803d",
        "& .MuiAlert-icon": { color: "#16a34a" },
        borderRadius: "12px",
      }}
      action={
        <IconButton
          size="small"
          aria-label="Cerrar aviso"
          onClick={() => setOpen(false)}
          sx={{ color: "#15803d", mt: -0.25 }}
        >
          <X size={14} />
        </IconButton>
      }
    >
      <AlertTitle sx={{ color: "#15803d", fontWeight: 600 }}>Éxito</AlertTitle>
      {message}
    </Alert>
  )
}
