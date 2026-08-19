"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"

type DeleteEmployeeButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  employeeId: string
  employeeName: string
  returnTo?: string
}

export default function DeleteEmployeeButton({
  action,
  employeeId,
  employeeName,
  returnTo,
}: DeleteEmployeeButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="contained"
        color="error"
        size="small"
        onClick={() => setOpen(true)}
        sx={{ height: 28, px: 1.5, fontSize: 12, boxShadow: "none", "&:hover": { boxShadow: "none" } }}
      >
        Eliminar
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
          ¿Eliminar a {employeeName}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción eliminará al empleado del portal y también intentará remover su acceso a
            los cursos asignados.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <form action={action}>
            <input type="hidden" name="empleado_id" value={employeeId} />
            {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
            <Button
              type="submit"
              variant="contained"
              color="error"
              onClick={() => setOpen(false)}
              sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" } }}
            >
              Sí, eliminar
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  )
}
