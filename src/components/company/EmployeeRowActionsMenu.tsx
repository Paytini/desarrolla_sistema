"use client"

import { useState, useTransition } from "react"
import ActionsMenu, { ActionsMenuDivider, ActionsMenuItem } from "@/components/shared/ActionsMenu"
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog"
import { Eye, Trash2, UserCheck, UserX } from "lucide-react"
import { companyPath } from "@/lib/company/routes"

type EmployeeAction = (formData: FormData) => void | Promise<void>

type EmployeeRowActionsMenuProps = {
  slug: string
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
  slug,
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
      <ActionsMenu ariaLabel={`Acciones para ${employeeName}`}>
        {({ close }) => (
          <>
            <ActionsMenuItem
              icon={<Eye size={15} strokeWidth={2} />}
              label="Ver perfil"
              href={companyPath(slug, `/employees/${employeeId}`)}
              onClick={close}
            />
            <ActionsMenuItem
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
            <ActionsMenuItem
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
      </ActionsMenu>

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
