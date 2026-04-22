import Link from "next/link"
import InfoCard from "@/components/portal/InfoCard"
import PageHeader from "@/components/portal/PageHeader"
import {
  architectureLayers,
  employeeModules,
  rhModules,
  superAdminModules,
} from "@/lib/portal-blueprint"

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 lg:px-10">
        <section className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur md:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <PageHeader
              eyebrow="Desarrolla360"
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

        <section className="grid gap-4 lg:grid-cols-3">
          {architectureLayers.map((layer) => (
            <InfoCard
              key={layer.title}
              title={layer.title}
              description={layer.description}
              accent={layer.accent}
            />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <InfoCard
            title="Dashboard SuperAdmin"
            description="Control centralizado de empresas, paquetes, vigencias, accesos y monitoreo global."
            accent="teal"
          >
            <ul className="space-y-2 text-sm text-slate-700">
              {superAdminModules.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </InfoCard>
          <InfoCard
            title="Dashboard Empresa / RH"
            description="Operacion diaria de la cuenta corporativa, alta de empleados y seguimiento academico."
            accent="violet"
          >
            <ul className="space-y-2 text-sm text-slate-700">
              {rhModules.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </InfoCard>
          <InfoCard
            title="Dashboard Empleado"
            description="Vista individual con enfoque en cursos, trayectorias, constancias y recordatorios."
            accent="amber"
          >
            <ul className="space-y-2 text-sm text-slate-700">
              {employeeModules.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </InfoCard>
        </section>
      </main>
    </div>
  )
}
