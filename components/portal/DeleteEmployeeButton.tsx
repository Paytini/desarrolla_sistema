"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type DeleteEmployeeButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  empleadoId: number
  employeeName: string
  returnTo?: string
}

export default function DeleteEmployeeButton({
  action,
  empleadoId,
  employeeName,
  returnTo,
}: DeleteEmployeeButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-destructive">
            Confirmar eliminación
          </p>
          <AlertDialogTitle>¿Eliminar a {employeeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará al empleado del portal y también intentará remover su usuario en
            WordPress/Tutor LMS.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="empleado_id" value={empleadoId} />
            {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
            <Button
              type="submit"
              variant="destructive"
              onClick={() => setOpen(false)}
            >
              Sí, eliminar
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
