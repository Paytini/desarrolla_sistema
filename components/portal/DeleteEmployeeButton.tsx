"use client"

import { useEffect, useRef, useState } from "react"

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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
      return
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        Eliminar
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
            <h3 className="text-xl font-semibold text-slate-950">¿Eliminar a {employeeName}?</h3>
            <p className="text-sm leading-6 text-slate-600">
              Esta accion eliminara al empleado del portal y tambien intentara remover su usuario en
              WordPress/Tutor LMS.
            </p>
          </div>

          <form action={action} className="flex flex-wrap justify-end gap-2">
            <input type="hidden" name="empleado_id" value={empleadoId} />
            {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}

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
