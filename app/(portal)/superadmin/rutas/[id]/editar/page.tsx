import PageHeader from "@/components/portal/PageHeader"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteRuta, updateRuta } from "../../actions"
import RutaForm from "../../_components/RutaForm"

const errorMessages: Record<string, string> = {
  nombre: "El nombre de la ruta es obligatorio.",
  tiene_empresas:
    "No se puede eliminar una ruta asignada a empresas. Desasígnala primero y guarda los cambios.",
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EditarRutaPage({ params, searchParams }: PageProps) {
  await requireSuperAdminSession()

  const { id: idStr } = await params
  const id = Number(idStr)
  if (!id) notFound()

  const sp = await searchParams
  const error = readSearchParam(sp, "error")

  const [ruta, paqueteCursos, empresas] = await Promise.all([
    prisma.rutaAprendizaje.findUnique({
      where: { id },
      include: {
        cursos: { orderBy: { orden: "asc" } },
        empresas: { select: { id: true } },
      },
    }),
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

  if (!ruta) notFound()

  const boundUpdate = updateRuta.bind(null, ruta.id)
  const boundDelete = deleteRuta.bind(null, ruta.id)

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
        title={`Editar: ${ruta.nombre}`}
        description="Actualiza la secuencia de cursos y las empresas asignadas"
      />
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessages[error] ?? error}
        </div>
      )}
      <div className="rounded-xl border border-[#f0f0f0] bg-white p-6">
        <RutaForm
          availableCourses={paqueteCursos}
          availableEmpresas={empresas}
          initialNombre={ruta.nombre}
          initialDescripcion={ruta.descripcion ?? ""}
          initialCursos={ruta.cursos.map((c) => ({
            wp_curso_id: c.wp_curso_id,
            nombre_curso: c.nombre_curso,
            orden: c.orden,
          }))}
          initialEmpresaIds={ruta.empresas.map((e) => e.id)}
          initialActivo={ruta.activo}
          action={boundUpdate}
          submitLabel="Guardar cambios"
          onDelete={boundDelete}
        />
      </div>
    </div>
  )
}
