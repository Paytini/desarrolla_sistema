import Link from "next/link"

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-10">
      <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Error 404
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">No encontramos esta pagina</h1>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-6 text-slate-700">
            La direccion que intentaste abrir no existe o ya no esta disponible. Revisa el enlace o
            vuelve al inicio.
          </p>

          <div className="flex justify-end">
            <Link
              href="/"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
