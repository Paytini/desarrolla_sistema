import { alpha } from "@mui/material/styles"
import Box from "@mui/material/Box"
import { Trash2 } from "lucide-react"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import EyebrowLabel from "@/components/shared/EyebrowLabel"

type DeleteConfirmDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  action: (formData: FormData) => void | Promise<void>
  hiddenFields?: Record<string, string | number>
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Sí, eliminar",
  cancelLabel = "Cancelar",
  action,
  hiddenFields,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: "50%",
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                color: "error.main",
              }}
            >
              <Trash2 size={16} strokeWidth={2} />
            </Box>
            <EyebrowLabel color="error.main" sx={{ letterSpacing: "0.16em" }}>
              Confirmar eliminación
            </EyebrowLabel>
          </Box>
          {title}
        </>
      }
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmColor="error"
      action={action}
      hiddenFields={hiddenFields}
    />
  )
}
