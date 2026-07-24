"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"

type DeletePackageButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  packageId: number
  packageName: string
  assignedCompaniesCount: number
}

export default function DeletePackageButton({
  action,
  packageId,
  packageName,
  assignedCompaniesCount,
}: DeletePackageButtonProps) {
  const [open, setOpen] = useState(false)

  if (assignedCompaniesCount > 0) {
    return (
      <Chip
        label="Asignado a empresa"
        size="small"
        sx={{
          height: 20,
          fontSize: "10px",
          bgcolor: "action.hover",
          color: "text.secondary",
          "& .MuiChip-label": { px: 1 },
        }}
      />
    )
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          height: 28,
          px: 1.25,
          fontSize: 12,
          borderColor: "rgba(239,68,68,0.3)",
          color: "error.main",
          "&:hover": {
            bgcolor: "rgba(239,68,68,0.06)",
            borderColor: "error.main",
          },
        }}
      >
        Eliminar paquete
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
            Confirmar eliminación
          </Typography>
          ¿Eliminar {packageName}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            El paquete se ocultará del catálogo y ya no aparecerá para nuevas asignaciones.
            No se eliminarán cursos ni datos históricos ya guardados.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <form action={action}>
            <input type="hidden" name="paquete_id" value={packageId} />
            <Button
              type="submit"
              variant="contained"
              color="error"
              onClick={() => setOpen(false)}
            >
              Sí, eliminar
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  )
}
