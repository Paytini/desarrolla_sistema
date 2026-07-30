"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import { cancelConsultingRequestAction, confirmConsultingRequestAction } from "@/app/(portal)/superadmin/consulting/actions"

type ConsultingRequestActionsProps = {
  requestId: number
  areaLabel: string
  companyName: string
}

export function ConsultingRequestActions({ requestId, areaLabel, companyName }: ConsultingRequestActionsProps) {
  const [dialog, setDialog] = useState<"confirm" | "cancel" | null>(null)

  return (
    <>
      <div className="flex shrink-0 gap-1.5">
        <Button
          variant="contained"
          size="small"
          onClick={() => setDialog("confirm")}
          sx={{ height: 28, px: 1.5, fontSize: 12, boxShadow: "none", "&:hover": { boxShadow: "none" } }}
        >
          Confirmar
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => setDialog("cancel")}
          sx={{ height: 28, px: 1.5, fontSize: 12 }}
        >
          Cancelar
        </Button>
      </div>

      <Dialog
        open={dialog === "confirm"}
        onClose={() => setDialog(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", border: "1px solid", borderColor: "divider" } },
        }}
      >
        <DialogTitle>¿Confirmar esta consultoría?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se marcará la sesión de {areaLabel} de {companyName} como confirmada, y le avisaremos al RH de la
            empresa.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setDialog(null)}>
            Volver
          </Button>
          <form action={confirmConsultingRequestAction}>
            <input type="hidden" name="request_id" value={requestId} />
            <Button
              type="submit"
              variant="contained"
              onClick={() => setDialog(null)}
              sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" } }}
            >
              Sí, confirmar
            </Button>
          </form>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "16px", border: "1px solid", borderColor: "divider" } },
        }}
      >
        <DialogTitle>¿Cancelar esta consultoría?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se marcará la sesión de {areaLabel} de {companyName} como cancelada, y le avisaremos al RH de la
            empresa.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setDialog(null)}>
            Volver
          </Button>
          <form action={cancelConsultingRequestAction}>
            <input type="hidden" name="request_id" value={requestId} />
            <Button
              type="submit"
              variant="contained"
              color="error"
              onClick={() => setDialog(null)}
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
