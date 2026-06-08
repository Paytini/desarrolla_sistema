"use client"

import { useTransition } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toggleCompanyStatusAction } from "@/app/(portal)/superadmin/empresas/actions"

interface SuspendCompanyButtonProps {
  empresaId: number
  activo: boolean
  nombre: string
}

export function SuspendCompanyButton({ empresaId, activo, nombre }: SuspendCompanyButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    const formData = new FormData()
    formData.set("empresa_id", String(empresaId))
    startTransition(() => {
      void toggleCompanyStatusAction(formData)
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            size="sm"
            type="button"
            disabled={isPending}
            className="h-7 px-2.5 text-[12px]"
            style={
              activo
                ? { background: "#0f172a", color: "#fff" }
                : { background: "#F5853F", color: "#fff" }
            }
          />
        }
      >
        {isPending ? "…" : activo ? "Suspender" : "Reactivar"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activo ? "¿Suspender empresa?" : "¿Reactivar empresa?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activo
              ? `Esto suspenderá "${nombre}". Todos sus empleados y el usuario RH perderán acceso al portal de inmediato.`
              : `Esto reactivará "${nombre}". Sus empleados recuperarán acceso al portal.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              activo
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {activo ? "Sí, suspender" : "Sí, reactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
