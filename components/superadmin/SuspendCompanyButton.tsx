"use client"

import { useState, useTransition } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import { toggleCompanyStatusAction } from "@/app/(portal)/superadmin/companies/actions"

interface SuspendCompanyButtonProps {
  companyId: string
  active: boolean
  name: string
}

export function SuspendCompanyButton({ companyId, active, name }: SuspendCompanyButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    const formData = new FormData()
    formData.set("empresa_id", String(companyId))
    startTransition(() => {
      void toggleCompanyStatusAction(formData)
    })
    setOpen(false)
  }

  return (
    <>
      <Button
        size="small"
        variant="contained"
        disabled={isPending}
        onClick={() => setOpen(true)}
        sx={{
          height: 28,
          px: 1.25,
          fontSize: 12,
          bgcolor: active ? "#0f172a" : "primary.main",
          color: "#fff",
          boxShadow: "none",
          "&:hover": {
            bgcolor: active ? "#1e293b" : "primary.dark",
            boxShadow: "none",
          },
        }}
      >
        {isPending ? "…" : active ? "Suspender" : "Reactivar"}
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
        <DialogTitle>
          {active ? "¿Suspender empresa?" : "¿Reactivar empresa?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {active
              ? `Esto suspenderá "${name}". Todos sus empleados y el usuario RH perderán acceso al portal de inmediato.`
              : `Esto reactivará "${name}". Sus empleados recuperarán acceso al portal.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={active ? "error" : "primary"}
            onClick={handleConfirm}
          >
            {active ? "Sí, suspender" : "Sí, reactivar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
