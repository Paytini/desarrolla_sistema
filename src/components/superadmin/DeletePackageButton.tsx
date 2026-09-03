"use client"

import { useState } from "react"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
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
      <Button
        variant="outlined"
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          height: 28,
          px: 1.25,
          fontSize: 12,
          borderColor: "rgba(239,68,68,0.3)",
          color: "error.main",
          "&:hover": {
            bgcolor: "rgba(239,68,68,0.06)",
            borderColor: "error.main",
          },
        }}
      >
        Eliminar paquete
      </Button>

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
