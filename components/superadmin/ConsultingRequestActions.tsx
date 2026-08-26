"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { SubmitButton } from "@/components/shared/SubmitButton"
import {
  cancelConsultingRequestAction,
  confirmConsultingRequestAction,
} from "@/app/(portal)/superadmin/consulting/actions"
import { CONSULTING_TIME_SLOTS } from "@/lib/consulting-schedule"

type ConsultingRequestActionsProps = {
  requestId: string
  areaLabel: string
  companyName: string
  preferredDate: string
  preferredTime: string
}

export function ConsultingRequestActions({
  requestId,
  areaLabel,
  companyName,
  preferredDate,
  preferredTime,
}: ConsultingRequestActionsProps) {
  const [dialog, setDialog] = useState<"confirm" | "cancel" | null>(null)
  const [date, setDate] = useState(preferredDate)
  const [time, setTime] = useState(preferredTime)

  return (
    <>
      <div className="flex shrink-0 gap-1">
        <Tooltip title="Confirmar">
          <IconButton
            onClick={() => setDialog("confirm")}
            aria-label={`Confirmar consultoría de ${areaLabel}`}
            size="small"
            sx={{
              color: "success.main",
              "&:hover": { transform: "none", backgroundColor: "rgba(22, 163, 74, 0.08)" },
              "&:active": { transform: "none" },
            }}
          >
            <Check size={18} strokeWidth={2} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Cancelar">
          <IconButton
            onClick={() => setDialog("cancel")}
            aria-label={`Cancelar consultoría de ${areaLabel}`}
            size="small"
            sx={{
              color: "error.main",
              "&:hover": { transform: "none", backgroundColor: "rgba(220, 38, 38, 0.08)" },
              "&:active": { transform: "none" },
            }}
          >
            <X size={18} strokeWidth={2} />
          </IconButton>
        </Tooltip>
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
          <DialogContentText sx={{ mb: 2.5 }}>
            Revisa la fecha y hora antes de confirmar la sesión de {areaLabel} de {companyName} — si
            el horario que pidieron no funciona, ajústalo aquí. Le avisaremos al HR de la empresa
            con el horario final.
          </DialogContentText>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              label="Fecha"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label="Hora"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              fullWidth
            >
              {CONSULTING_TIME_SLOTS.map((slot) => (
                <MenuItem key={slot} value={slot}>
                  {slot}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setDialog(null)}>
            Volver
          </Button>
          <form action={confirmConsultingRequestAction}>
            <input type="hidden" name="request_id" value={requestId} />
            <input type="hidden" name="preferred_date" value={date} />
            <input type="hidden" name="preferred_time" value={time} />
            <SubmitButton
              variant="contained"
              sx={{ boxShadow: "none", "&:hover": { boxShadow: "none" } }}
            >
              Sí, confirmar
            </SubmitButton>
          </form>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        title="¿Cancelar esta consultoría?"
        description={`Se marcará la sesión de ${areaLabel} de ${companyName} como cancelada, y le avisaremos al HR de la empresa.`}
        confirmLabel="Sí, cancelar"
        confirmColor="error"
        cancelLabel="Volver"
        action={cancelConsultingRequestAction}
        hiddenFields={{ request_id: requestId }}
      />
    </>
  )
}
