"use client"

import { useState } from "react"
import { X } from "lucide-react"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import EyebrowLabel from "@/components/shared/EyebrowLabel"

type CancelConsultingRequestButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  requestId: string
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
      <Tooltip title="Cancelar">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label={`Cancelar consultoría de ${areaLabel}`}
          size="small"
          sx={{
            color: "error.main",
            "&:hover": { backgroundColor: "rgba(220, 38, 38, 0.08)" },
          }}
        >
          <X size={18} strokeWidth={2} />
        </IconButton>
      </Tooltip>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          <>
            <EyebrowLabel color="error.main" sx={{ mb: 0.75, letterSpacing: "0.16em" }}>
              Confirmar cancelación
            </EyebrowLabel>
            ¿Cancelar la consultoría de {areaLabel}?
          </>
        }
        description="Esta acción marcará la solicitud como cancelada. Tendrás que agendar una nueva si cambias de opinión."
        confirmLabel="Sí, cancelar"
        confirmColor="error"
        cancelLabel="Volver"
        action={action}
        hiddenFields={{
          request_id: requestId,
          ...(returnTo ? { return_to: returnTo } : {}),
        }}
      />
    </>
  )
}
