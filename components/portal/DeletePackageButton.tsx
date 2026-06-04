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
import { Badge } from "@/components/ui/badge"

type DeletePackageButtonProps = {
  action: (formData: FormData) => void | Promise<void>
  paqueteId: number
  packageName: string
  assignedCompaniesCount: number
}

export default function DeletePackageButton({
  action,
  paqueteId,
  packageName,
  assignedCompaniesCount,
}: DeletePackageButtonProps) {
  const [open, setOpen] = useState(false)
  const hasActiveAssignments = assignedCompaniesCount > 0

  if (hasActiveAssignments) {
    return (
      <Badge variant="secondary" className="cursor-default">
        Asignado a empresa
      </Badge>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          />
        }
      >
        Eliminar paquete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-destructive">
            Confirmar eliminación
          </p>
          <AlertDialogTitle>¿Eliminar {packageName}?</AlertDialogTitle>
          <AlertDialogDescription>
            El paquete se ocultará del catálogo y ya no aparecerá para nuevas asignaciones.
            No se eliminarán cursos ni datos históricos ya guardados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="paquete_id" value={paqueteId} />
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
