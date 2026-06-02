import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { prisma } from "@/lib/prisma"
import { readSearchParam } from "@/lib/search-params"
import { CheckCircle2, Map, Plus } from "lucide-react"
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SuperAdmin</p>
          <h1 className="text-2xl font-bold text-slate-950">Rutas de aprendizaje</h1>
          <p className="mt-0.5 text-sm text-slate-500">Plantillas globales de secuencias de cursos.</p>
        </div>
        <Link
          href="/superadmin/rutas/nueva"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8761A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C45F0A]"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva ruta
        </Link>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{successMessages[success] ?? success}</AlertDescription>
        </Alert>
      )}

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Total rutas", value: totalRutas, sub: "Plantillas de aprendizaje creadas", icon: Map, cls: "bg-[#fff5ed] text-[#E8761A]" },
          { label: "Asignadas a empresas", value: asignadas, sub: "Con al menos una empresa asignada", icon: Map, cls: "bg-teal-50 text-teal-600" },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                  <Icon size={16} strokeWidth={2} />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Routes table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Rutas registradas</CardTitle>
          <CardDescription>Secuencias de cursos ordenadas por posición.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rutas.length === 0 ? (
            <div className="px-6 pb-6">
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                <Map size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">No hay rutas creadas aún.</p>
                <Link href="/superadmin/rutas/nueva" className="mt-2 inline-block text-sm font-semibold text-[#E8761A] hover:underline">
                  Crear primera ruta →
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Empresas asignadas</TableHead>
                  <TableHead>Cursos</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rutas.map((ruta) => (
                  <TableRow key={ruta.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-950">{ruta.nombre}</p>
                        {ruta.descripcion && (
                          <p className="text-xs text-slate-400">{ruta.descripcion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ruta.activo ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
                        {ruta.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ruta.empresas.length === 0 ? (
                        <span className="text-xs text-slate-400">Sin asignar</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ruta.empresas.map((e) => (
                            <Badge key={e.id} variant="secondary" className="text-[10px]">
                              {e.nombre}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ruta.cursos.map((c, i) => (
                          <span
                            key={c.id}
                            className="flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 border border-slate-200"
                          >
                            <span className={`inline-block size-1.5 rounded-full ${i === 0 ? "bg-green-500" : i === ruta.cursos.length - 1 ? "bg-slate-300" : "bg-[#E8761A]"}`} />
                            {i + 1}. {c.nombre_curso}
                          </span>
                        ))}
                        {ruta.cursos.length === 0 && <span className="text-xs text-slate-400">Sin cursos</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/superadmin/rutas/${ruta.id}/editar`}
                        className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
                      >
                        Editar →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
