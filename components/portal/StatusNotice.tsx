"use client"

import { useEffect, useId, useState } from "react"

type StatusNoticeProps = {
  tone: "success" | "error"
  message: string
  title?: string
}

const toneClasses = {
  success: {
    container: "border-teal-200 bg-teal-50 text-teal-900",
    button: "text-teal-700 hover:bg-teal-100 hover:text-teal-950",
  },
  error: {
    container: "border-rose-200 bg-rose-50 text-rose-900",
    button: "text-rose-700 hover:bg-rose-100 hover:text-rose-950",
  },
}

export default function StatusNotice({ tone, message, title }: StatusNoticeProps) {
  const [visible, setVisible] = useState(true)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!visible || tone !== "error") {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVisible(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [tone, visible])

  if (!visible) {
    return null
  }

  if (tone === "error") {
    return (
      <div
        className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setVisible(false)
          }
        }}
      >
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-rose-200 bg-white shadow-2xl"
        >
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                  Error detectado
                </p>
                <h2 id={titleId} className="text-xl font-semibold text-slate-950">
                  {title ?? "No fue posible completar la accion"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label="Cerrar error"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-rose-700 transition hover:bg-rose-100 hover:text-rose-950"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <p id={descriptionId} className="max-h-60 overflow-y-auto text-sm leading-6 text-slate-700">
              {message}
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              No se aplicaron cambios inseguros. Si el error menciona WordPress o Tutor LMS,
              revisa que el usuario o curso sigan existiendo y vuelve a intentar la accion.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone].container}`}
      role="status"
    >
      <p className="leading-6">{message}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className={`-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-lg leading-none transition ${toneClasses[tone].button}`}
      >
        ×
      </button>
    </div>
  )
}
