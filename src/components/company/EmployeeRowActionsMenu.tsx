"use client"

import { useState, useTransition, type ReactNode } from "react"
import Box from "@mui/material/Box"
import ActionsPopover from "@/components/shared/ActionsPopover"
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog"
import { MoreVertical, Trash2, UserCheck, UserX } from "lucide-react"

type EmployeeAction = (formData: FormData) => void | Promise<void>

type EmployeeRowActionsMenuProps = {
  employeeId: string
  employeeName: string
  employeeActive: boolean
  returnTo: string
  toggleEmployeeStatusAction: EmployeeAction
  deleteEmployeeAction: EmployeeAction
}

function buildFormData(employeeId: string, returnTo: string) {
  const formData = new FormData()
  formData.set("empleado_id", employeeId)
  formData.set("return_to", returnTo)
  return formData
}

export default function EmployeeRowActionsMenu({
  employeeId,
  employeeName,
  employeeActive,
  returnTo,
  toggleEmployeeStatusAction,
  deleteEmployeeAction,
}: EmployeeRowActionsMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [, startTransition] = useTransition()

  function runAction(action: EmployeeAction) {
    startTransition(() => {
      action(buildFormData(employeeId, returnTo))
    })
  }

  return (
    <>
      <ActionsPopover
        transitionTimeout={140}
        paperSx={{ mt: 0.5, width: 208, py: 0.5 }}
        trigger={({ open, toggle, setAnchorEl }) => (
          <Box
            ref={setAnchorEl}
            component="button"
            type="button"
            onClick={toggle}
            aria-haspopup="true"
            aria-expanded={open}
            aria-label={`Acciones para ${employeeName}`}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              flexShrink: 0,
              border: "none",
              background: "none",
              borderRadius: "10px",
              color: "text.secondary",
              cursor: "pointer",
              transition: "background 0.15s ease",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <MoreVertical size={18} strokeWidth={2} />
          </Box>
        )}
      >
        {({ close }) => (
          <>
            <MenuRow
              icon={
                employeeActive ? (
                  <UserX size={15} strokeWidth={2} />
                ) : (
                  <UserCheck size={15} strokeWidth={2} />
                )
              }
              label={employeeActive ? "Suspender" : "Reactivar"}
              tone={employeeActive ? "amber" : "emerald"}
              onClick={() => {
                close()
                runAction(toggleEmployeeStatusAction)
              }}
            />
            <Box sx={{ my: 0.5, borderTop: "1px solid", borderColor: "divider" }} />
            <MenuRow
              icon={<Trash2 size={15} strokeWidth={2} />}
              label="Eliminar"
              tone="rose"
              onClick={() => {
                close()
                setDeleteOpen(true)
              }}
            />
          </>
        )}
      </ActionsPopover>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`¿Eliminar a ${employeeName}?`}
        description="Esta acción eliminará al empleado del portal y también intentará remover su acceso a los cursos asignados."
        action={deleteEmployeeAction}
        hiddenFields={{ empleado_id: employeeId, return_to: returnTo }}
      />
    </>
  )
}

function MenuRow({
  icon,
  label,
  tone = "neutral",
  onClick,
}: {
  icon: ReactNode
  label: string
  tone?: "neutral" | "amber" | "emerald" | "rose"
  onClick: () => void
}) {
  const toneColor: Record<string, string> = {
    neutral: "#374151",
    amber: "#92400E",
    emerald: "#065F46",
    rose: "#BE123C",
  }
  const toneHover: Record<string, string> = {
    neutral: "rgba(55,65,81,0.06)",
    amber: "rgba(245,158,11,0.08)",
    emerald: "rgba(16,185,129,0.08)",
    rose: "rgba(225,29,72,0.08)",
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        width: "100%",
        px: 2,
        py: 1.25,
        border: "none",
        background: "none",
        cursor: "pointer",
        textAlign: "left",
        color: toneColor[tone],
        fontSize: "0.8125rem",
        fontWeight: 500,
        fontFamily: "inherit",
        transition: "background 0.15s ease",
        "&:hover": { bgcolor: toneHover[tone] },
      }}
    >
      {icon}
      {label}
    </Box>
  )
}
