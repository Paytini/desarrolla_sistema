"use client"

import { useEffect } from "react"

type PortalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PortalError({ error, reset }: PortalErrorProps) {
  useEffect(() => {
    console.error("Portal runtime error", error)
  }, [error])

  const detail =
    process.env.NODE_ENV === "development"
      ? error.message
      : "El portal encontro un problema inesperado. Tus datos no fueron modificados por esta pantalla."

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-10">
      <section
        role="alert"
        className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-rose-200 bg-white shadow-2xl"
      >
        <div className="border-b border-rose-100 bg-rose-50 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
            Error del portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            No pudimos mostrar esta seccion
          </h1>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-6 text-slate-700">{detail}</p>

          {error.digest ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              ID de error: <span className="font-mono text-slate-700">{error.digest}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Ir al inicio
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
