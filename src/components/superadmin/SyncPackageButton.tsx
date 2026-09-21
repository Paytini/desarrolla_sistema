"use client"

import { useRef, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import { Loader2, RotateCw } from "lucide-react"
import type { PackageSyncImpact } from "@/lib/wordpress/course-sync"

type SyncPackageButtonProps = {
  companyId: string
  action: (formData: FormData) => void | Promise<void>
  getImpact: (companyId: string) => Promise<PackageSyncImpact>
}

export function SyncPackageButton({ companyId, action, getImpact }: SyncPackageButtonProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [impact, setImpact] = useState<PackageSyncImpact | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  async function handleOpen() {
    setLoadingImpact(true)
    try {
      const result = await getImpact(companyId)
      setImpact(result)
      setOpen(true)
    } finally {
      setLoadingImpact(false)
    }
  }

  function handleConfirm() {
    setOpen(false)
    formRef.current?.requestSubmit()
  }

  const hasChanges =
    impact !== null && (impact.employeesLosingAccess > 0 || impact.employeesGainingAccess > 0)

  return (
    <>
      <form ref={formRef} action={action}>
        <input type="hidden" name="empresa_id" value={companyId} />
      </form>
      <Tooltip title="Sincronizar">
        <IconButton
          type="button"
          onClick={handleOpen}
          disabled={loadingImpact}
          aria-label="Sincronizar paquete con la empresa"
          size="small"
          sx={{
            width: 32,
            height: 32,
            color: "text.secondary",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {loadingImpact ? (
            <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
          ) : (
            <RotateCw size={14} strokeWidth={2} />
          )}
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar sincronizacion{impact?.packageName ? `: ${impact.packageName}` : ""}</DialogTitle>
        <DialogContent>
          {hasChanges ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5, display: "grid", gap: 1, fontSize: 14 }}>
              {impact && impact.employeesLosingAccess > 0 ? (
                <li>
                  <strong>{impact.employeesLosingAccess}</strong> empleado(s) perderan acceso a{" "}
                  <strong>{impact.coursesLost}</strong> curso(s)
                  {impact.coursesAtRisk > 0
                    ? ` (${impact.coursesAtRisk} con progreso o ya completado)`
                    : ""}
                  .
                </li>
              ) : null}
              {impact && impact.employeesGainingAccess > 0 ? (
                <li>
                  <strong>{impact.employeesGainingAccess}</strong> empleado(s) obtendran acceso a{" "}
                  <strong>{impact.coursesGained}</strong> curso(s) nuevo(s).
                </li>
              ) : null}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
              No hay cambios de cursos pendientes para esta empresa.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} variant="contained" disableElevation>
            Confirmar y sincronizar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
