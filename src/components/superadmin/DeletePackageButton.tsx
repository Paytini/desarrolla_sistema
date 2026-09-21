"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog"

type DeletePackageButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  packageId: string
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
      <Tooltip title="Eliminar paquete">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label={`Eliminar ${packageName}`}
          size="small"
          sx={{
            width: 32,
            height: 32,
            color: "error.main",
            "&:hover": { bgcolor: "rgba(239,68,68,0.08)" },
          }}
        >
          <Trash2 size={14} strokeWidth={2} />
        </IconButton>
      </Tooltip>

      <DeleteConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`¿Eliminar ${packageName}?`}
        description="El paquete se ocultará del catálogo y ya no aparecerá para nuevas asignaciones. No se eliminarán cursos ni datos históricos ya guardados."
        action={action}
        hiddenFields={{ paquete_id: packageId }}
      />
    </>
  )
}
