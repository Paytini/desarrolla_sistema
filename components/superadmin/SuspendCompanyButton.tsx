"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { toggleCompanyStatusAction } from "@/app/(portal)/superadmin/companies/actions"

interface SuspendCompanyButtonProps {
  companyId: string
  active: boolean
  name: string
}

export function SuspendCompanyButton({ companyId, active, name }: SuspendCompanyButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="small"
        variant="contained"
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
        {active ? "Suspender" : "Reactivar"}
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={active ? "¿Suspender empresa?" : "¿Reactivar empresa?"}
        description={
          active
            ? `Esto suspenderá "${name}". Todos sus empleados y el usuario HR perderán acceso al portal de inmediato.`
            : `Esto reactivará "${name}". Sus empleados recuperarán acceso al portal.`
        }
        confirmLabel={active ? "Sí, suspender" : "Sí, reactivar"}
        confirmColor={active ? "error" : "primary"}
        action={toggleCompanyStatusAction}
        hiddenFields={{ empresa_id: companyId }}
      />
    </>
  )
}
