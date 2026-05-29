import KpiCard from "@/components/portal/KpiCard"
import PageHeader from "@/components/portal/PageHeader"
import StatusBadge from "@/components/portal/StatusBadge"
import StatusNotice from "@/components/portal/StatusNotice"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { Plus } from "lucide-react"
import Link from "next/link"

const successMessages: Record<string, string> = {
  creada: "La ruta fue creada correctamente.",
  actualizada: "La ruta fue actualizada correctamente.",
  eliminada: "La ruta fue eliminada.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperadminRutasPage({ searchParams }: PageProps) {
  await requireSuperAdminSession()

  const params = await searchParams
  const success = readSearchParam(params, "success")

  const rutas = await prisma.rutaAprendizaje.findMany({
    include: {
      cursos: { orderBy: { orden: "asc" } },
      empresas: { select: { id: true, nombre: true } },
    },
    orderBy: { created_at: "desc" },
  })

  const totalRutas = rutas.length
  const asignadas = rutas.filter((r) => r.empresas.length > 0).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SuperAdmin / Rutas"
        title="Rutas de aprendizaje"
        description="Plantillas globales de secuencias de cursos"
        actions={
          <Link
            href="/superadmin/rutas/nueva"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8761A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C45F0A]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Nueva ruta
          </Link>
        }
      />

      {success ? (
        <StatusNotice tone="success" message={successMessages[success] ?? success} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="Total rutas" value={String(totalRutas)} borderColor="orange" />
        <KpiCard label="Asignadas a empresas" value={String(asignadas)} borderColor="charcoal" />
      </div>

      {rutas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#f0f0f0] bg-white px-4 py-12 text-center text-sm text-[#94a3b8]">
          No hay rutas creadas aún.{" "}
          <Link href="/superadmin/rutas/nueva" className="font-semibold text-[#E8761A] hover:underline">
            Crear primera ruta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rutas.map((ruta) => {
            const tieneEmpresas = ruta.empresas.length > 0
            return (
              <div
                key={ruta.id}
                className="rounded-xl border border-[#f0f0f0] bg-white p-4"
                style={{
                  borderLeft: `4px solid ${tieneEmpresas && ruta.activo ? "#E8761A" : "#1a1a1a"}`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1a1a1a]">{ruta.nombre}</span>
                      <StatusBadge variant={ruta.activo ? "green" : "slate"}>
                        {ruta.activo ? "Activa" : "Inactiva"}
                      </StatusBadge>
                    </div>
                    {ruta.descripcion && (
                      <p className="mb-2 text-xs text-[#64748b]">{ruta.descripcion}</p>
                    )}
                    {tieneEmpresas ? (
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-[#94a3b8]">Asignada a:</span>
                        {ruta.empresas.map((e) => (
                          <span
                            key={e.id}
                            className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-semibold text-[#1a1a1a]"
                          >
                            {e.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-2 text-[10px] text-[#94a3b8]">Sin empresas asignadas</p>
                    )}
                    {ruta.cursos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ruta.cursos.map((c, i) => (
                          <span
                            key={c.id}
                            className="flex items-center gap-1 rounded-lg border border-[#f0f0f0] bg-[#f8fafc] px-2 py-0.5 text-[10px] text-[#1a1a1a]"
                          >
                            <span
                              className={`inline-block size-1.5 rounded-full ${
                                i === 0
                                  ? "bg-[#22c55e]"
                                  : i === ruta.cursos.length - 1
                                  ? "bg-[#e2e8f0]"
                                  : "bg-[#E8761A]"
                              }`}
                            />
                            {i + 1}. {c.nombre_curso}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/superadmin/rutas/${ruta.id}/editar`}
                    className="shrink-0 rounded-xl border border-[#f0f0f0] px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-[#f8fafc]"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
