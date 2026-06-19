import Image from "next/image"
import Link from "next/link"
import { PageHeader } from "@/components/shared/PageHeader"

function isDiagramImageUrl(url: string) {
  return /\.(svg|png|jpe?g|webp|gif)(\?.*)?$/i.test(url) || url.startsWith("/")
}

function PortalDiagramSection() {
  const diagramUrl = process.env.NEXT_PUBLIC_EXCALIDRAW_DIAGRAM_URL?.trim()

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-sm backdrop-blur">
      <div className="grid gap-6 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
            Diagrama del sistema
          </p>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Flujo visual del portal
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Aqui puedes mostrar el diagrama de Excalidraw con la arquitectura e integraciones principales
              entre Frontend, Backend, WordPress, Tutor LMS y base de datos.
            </p>
          </div>

          {diagramUrl ? (
            <a
              href={diagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Abrir diagrama
            </a>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              Configura <code className="font-semibold">NEXT_PUBLIC_EXCALIDRAW_DIAGRAM_URL</code>{" "}
              con el link publico o una exportacion SVG/PNG en <code>public/assets</code>.
            </div>
          )}
        </div>

        <div className="min-h-[22rem] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-inner">
          {diagramUrl ? (
            isDiagramImageUrl(diagramUrl) ? (
              <img
                src={diagramUrl}
                alt="Diagrama de arquitectura del portal Desarrolla360"
                className="h-full min-h-[22rem] w-full object-contain p-4"
              />
            ) : (
              <iframe
                src={diagramUrl}
                title="Diagrama de arquitectura del portal Desarrolla360"
                className="h-[32rem] w-full bg-white"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            )
          ) : (
            <div className="grid h-full min-h-[22rem] place-items-center p-8 text-center">
              <div className="max-w-sm space-y-3">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-7"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  >
                    <path d="M4 7h16" />
                    <path d="M4 17h16" />
                    <path d="M7 4v16" />
                    <path d="M17 4v16" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-900">Diagrama pendiente</p>
                <p className="text-sm leading-6 text-slate-500">
                  Exporta tu proyecto de Excalidraw como SVG/PNG o pega aqui una URL publica para mostrarlo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 lg:px-10">
        <section className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur md:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <PageHeader
              title="Portal empresarial para cursos corporativos y trazabilidad por empresa"
              description="Esta app se queda con la capa B2B del negocio: empresas, RH, empleados, cupos, reportes y constancias. WordPress y Tutor LMS se mantienen como motor comercial y academico del ecosistema."
            />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Entrar al portal
              </Link>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                Blueprint: <code>docs/ARCHITECTURE.md</code>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
              Arquitectura sugerida
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">WordPress</p>
                <p className="mt-1 text-sm text-slate-300">
                  Marketing, venta individual, WooCommerce y Tutor LMS Pro.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">Plugin puente</p>
                <p className="mt-1 text-sm text-slate-300">
                  Endpoints seguros para empleados, inscripciones, avance y constancias.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">Portal Next.js</p>
                <p className="mt-1 text-sm text-slate-300">
                  Dashboards de SuperAdmin, RH y empleado sobre PostgreSQL.
                </p>
              </div>
            </div>
          </div>
        </section>

        <PortalDiagramSection />
      </main>
    </div>
  )
}
