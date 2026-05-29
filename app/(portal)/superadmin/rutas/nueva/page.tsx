import PageHeader from "@/components/portal/PageHeader"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { createRuta } from "../actions"
import RutaForm from "../_components/RutaForm"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NuevaRutaPage({ searchParams }: PageProps) {
  await requireSuperAdminSession()

  const params = await searchParams
  const error = readSearchParam(params, "error")

  const [paqueteCursos, empresas] = await Promise.all([
    prisma.paqueteCurso.findMany({
      select: { wp_curso_id: true, nombre_curso: true },
      distinct: ["wp_curso_id"],
      orderBy: { nombre_curso: "asc" },
    }),
    prisma.empresa.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/superadmin/rutas"
          className="inline-flex items-center gap-1 text-sm text-[#64748b] hover:text-[#1a1a1a]"
        >
          <ChevronLeft size={14} />
          Rutas
        </Link>
      </div>
      <PageHeader
        eyebrow="SuperAdmin / Rutas"
        title="Nueva ruta"
        description="Define el nombre, cursos en orden y empresas asignadas"
      />
      {error === "nombre" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          El nombre de la ruta es obligatorio.
        </div>
      )}
      <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
        <RutaForm
          availableCourses={paqueteCursos}
          availableEmpresas={empresas}
          action={createRuta}
          submitLabel="Crear ruta"
        />
      </div>
    </div>
  )
}
