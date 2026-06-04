"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

type StatusNoticeProps = {
  tone: "success" | "error"
  message: string
  title?: string
}

export default function StatusNotice({ tone, message, title }: StatusNoticeProps) {
  const [open, setOpen] = useState(true)

  if (!open) return null

  if (tone === "error") {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
              Error detectado
            </p>
            <AlertDialogTitle>
              {title ?? "No fue posible completar la acción"}
            </AlertDialogTitle>
            <AlertDialogDescription className="max-h-60 overflow-y-auto leading-6">
              {message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
            No se aplicaron cambios inseguros. Si el error menciona WordPress o Tutor LMS,
            revisa que el usuario o curso sigan existiendo y vuelve a intentar la acción.
          </div>
          <AlertDialogFooter>
            <Button onClick={() => setOpen(false)}>Entendido</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <Alert className="border-green-200 bg-green-50 text-green-900">
      <AlertTitle className="flex items-center justify-between">
        <span>Éxito</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-green-700 hover:bg-green-100"
          onClick={() => setOpen(false)}
          aria-label="Cerrar aviso"
        >
          <X size={14} />
        </Button>
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
