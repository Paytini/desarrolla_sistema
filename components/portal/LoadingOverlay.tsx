type LoadingOverlayProps = {
  message?: string
  detail?: string
  fullscreen?: boolean
}

export default function LoadingOverlay({
  message = "Cargando...",
  detail = "Espera un momento mientras terminamos esta accion.",
  fullscreen = true,
}: LoadingOverlayProps) {
  return (
    <div
      className={`${
        fullscreen ? "fixed inset-0 z-[100]" : "absolute inset-0 z-20"
      } flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[2px]`}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200/80 bg-white/96 p-6 shadow-2xl shadow-slate-950/10">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <span className="d360-spinner" aria-hidden="true" />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-lg font-semibold text-slate-950">{message}</p>
            <p className="text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
