"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
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
      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={() => setOpen(true)}
        sx={{ height: 28, px: 1.5, fontSize: 12, flexShrink: 0 }}
      >
        Cancelar
      </Button>

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
