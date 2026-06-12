"use client"

import { useState, type ReactNode } from "react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ConfirmIconButtonProps = {
  icon: ReactNode
  label: string
  tone?: "brand" | "outline" | "outline-destructive"
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  action: (formData: FormData) => void | Promise<void>
  hiddenFields?: Record<string, string | number>
}

/**
 * Botón circular con ícono + tooltip que, al hacer clic, pide confirmación
 * en un modal antes de enviar el formulario asociado a una server action.
 */
export function ConfirmIconButton({
  icon,
  label,
  tone = "outline",
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  action,
  hiddenFields,
}: ConfirmIconButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              type="button"
              aria-label={label}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full transition-colors",
                tone === "brand" && "bg-brand text-brand-ink hover:bg-brand/90",
                tone === "outline" && "border border-border text-muted-foreground hover:bg-muted",
                tone === "outline-destructive" &&
                  "border border-destructive/30 text-destructive hover:bg-destructive/10"
              )}
            />
          }
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <form action={action}>
            {hiddenFields &&
              Object.entries(hiddenFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
            <Button
              type="submit"
              variant={tone === "outline-destructive" ? "destructive" : "default"}
              className={tone === "brand" ? "bg-brand text-brand-ink hover:bg-brand/90" : undefined}
              onClick={() => setOpen(false)}
            >
              {confirmLabel}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
