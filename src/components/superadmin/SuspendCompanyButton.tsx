"use client"

import { useState } from "react"
import { Pause, Play } from "lucide-react"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { toggleCompanyStatusAction } from "@/app/(portal)/superadmin/companies/actions"
import { fd, slate } from "@/lib/theme-tokens"

interface SuspendCompanyButtonProps {
  companyId: string
  active: boolean
  name: string
  iconOnly?: boolean
}

export function SuspendCompanyButton({
  companyId,
  active,
  name,
  iconOnly = false,
}: SuspendCompanyButtonProps) {
  const [open, setOpen] = useState(false)
  const label = active ? "Suspender" : "Reactivar"

  return (
    <>
      {iconOnly ? (
        <Tooltip title={label}>
          <IconButton
            onClick={() => setOpen(true)}
            aria-label={`${label} ${name}`}
            size="small"
            sx={{
              width: 32,
              height: 32,
              color: active ? slate[500] : "primary.main",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            {active ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          size="small"
          variant="contained"
          onClick={() => setOpen(true)}
          sx={{
            height: 28,
            px: 1.25,
            fontSize: 12,
            bgcolor: active ? slate[900] : "primary.main",
            color: fd.background,
            boxShadow: "none",
            "&:hover": {
              bgcolor: active ? slate[800] : "primary.dark",
              boxShadow: "none",
            },
          }}
        >
          {label}
        </Button>
      )}

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
