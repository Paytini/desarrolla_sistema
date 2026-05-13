"use client"

import { useEffect, useRef, useState } from "react"

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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const hasActiveAssignments = assignedCompaniesCount > 0

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      return
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  if (hasActiveAssignments) {
    return (
      <span className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
        Asignado a empresa
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        Eliminar paquete
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-auto w-[min(28rem,calc(100vw-2rem))] max-w-md rounded-[1.75rem] border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-950/35"
      >
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-600">
              Confirmar eliminacion
            </p>
            <h3 className="text-xl font-semibold text-slate-950">¿Eliminar {packageName}?</h3>
            <p className="text-sm leading-6 text-slate-600">
              El paquete se ocultara del catalogo y ya no aparecera para nuevas asignaciones.
              No se eliminaran cursos ni datos historicos ya guardados.
            </p>
          </div>

          <form action={action} className="flex flex-wrap justify-end gap-2">
            <input type="hidden" name="paquete_id" value={paqueteId} />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Si, eliminar
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
