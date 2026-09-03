"use client"

import { useState } from "react"
import { Eye, X } from "lucide-react"
import Dialog from "@mui/material/Dialog"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { InfoField } from "@/components/shared/InfoField"
import { StatusLabel } from "@/components/shared/StatusLabel"
import { CONSULTING_STATUS_LABEL, CONSULTING_STATUS_VARIANT } from "@/lib/consulting/status"
import type { ConsultingRequestStatus } from "@prisma/client"

type ConsultingRequestDetailsButtonProps = {
  areaLabel: string
  dateTimeLabel: string
  context: string
  contactPhone: string
  contactMethodLabel: string
  status: ConsultingRequestStatus
}

export function ConsultingRequestDetailsButton({
  areaLabel,
  dateTimeLabel,
  context,
  contactPhone,
  contactMethodLabel,
  status,
}: ConsultingRequestDetailsButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip title="Ver detalles">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label={`Ver detalles de la consultoría de ${areaLabel}`}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <Eye size={18} strokeWidth={2} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{areaLabel}</h2>
          <IconButton onClick={() => setOpen(false)} aria-label="Cerrar">
            <X size={18} />
          </IconButton>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Fecha y hora" value={dateTimeLabel} truncate={false} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Estado
              </p>
              <div className="mt-1">
                <StatusLabel
                  status={status}
                  variantMap={CONSULTING_STATUS_VARIANT}
                  labelMap={CONSULTING_STATUS_LABEL}
                />
              </div>
            </div>
            <InfoField label="Teléfono de contacto" value={contactPhone} truncate={false} />
            <InfoField label="Método de contacto" value={contactMethodLabel} truncate={false} />
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Contexto
            </p>
            <p className="text-sm text-slate-700">{context}</p>
          </div>
        </div>
      </Dialog>
    </>
  )
}
