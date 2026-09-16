"use client"

import Box from "@mui/material/Box"
import { ChevronDown } from "lucide-react"
import ActionsPopover from "@/components/shared/ActionsPopover"
import { SubmitButton } from "@/components/shared/SubmitButton"
import { fd } from "@/lib/theme-tokens"

const SELECT_SX = {
  height: 32,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: fd.background,
  px: 1,
  fontSize: 12,
  color: "text.primary",
  outline: "none",
  cursor: "pointer",
  "&:focus": { borderColor: "primary.main" },
}

type PackageOption = { id: string; name: string }

type AssignPackagePopoverProps = {
  companyId: string
  currentPackageId?: string
  packages: PackageOption[]
  action: (formData: FormData) => void | Promise<void>
}

export function AssignPackagePopover({
  companyId,
  currentPackageId,
  packages,
  action,
}: AssignPackagePopoverProps) {
  return (
    <ActionsPopover
      placement="bottom-end"
      trigger={({ toggle, setAnchorEl, open }) => (
        <Box
          ref={setAnchorEl}
          component="button"
          type="button"
          onClick={toggle}
          aria-haspopup="true"
          aria-expanded={open}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            height: 32,
            px: 1.5,
            borderRadius: "8px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: fd.background,
            fontSize: 12,
            fontWeight: 500,
            color: "text.secondary",
            cursor: "pointer",
            "&:hover": { borderColor: "text.secondary" },
          }}
        >
          Cambiar
          <ChevronDown size={13} />
        </Box>
      )}
    >
      {() => (
        <Box
          component="form"
          action={action}
          sx={{ display: "grid", gap: 1, p: 2, width: 260 }}
        >
          <input type="hidden" name="empresa_id" value={companyId} />
          <Box
            component="select"
            name="paquete_id"
            required
            aria-label="Paquete"
            defaultValue={currentPackageId ?? ""}
            sx={SELECT_SX}
          >
            <option value="" disabled>
              Selecciona un paquete
            </option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Box>
          <Box
            component="input"
            type="date"
            name="fecha_vencimiento"
            aria-label="Fecha de vencimiento"
            sx={SELECT_SX}
          />
          <SubmitButton
            size="small"
            variant="contained"
            disableElevation
            sx={{ height: 32, fontSize: "0.8125rem", borderRadius: "8px" }}
          >
            Asignar
          </SubmitButton>
        </Box>
      )}
    </ActionsPopover>
  )
}
