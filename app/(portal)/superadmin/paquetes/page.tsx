import { CreatePaqueteSheet } from "@/components/superadmin/CreatePaqueteSheet"
import { PaqueteCard } from "@/components/superadmin/PaqueteCard"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Package, RotateCw } from "lucide-react"
import {
  assignPackageToCompanyAction,
  syncPackageToCompanyEmployeesAction,
} from "./actions"

const successMessages: Record<string, string> = {
  paquete_creado: "El paquete se creó correctamente.",
  paquete_eliminado: "El paquete se eliminó del catálogo.",
  paquete_asignado: "El paquete activo de la empresa se actualizó correctamente.",
  sync_ok: "Se sincronizaron los cursos con los empleados activos.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para crear el paquete.",
  cursos: "Debes seleccionar al menos un curso.",
  bundle: "No fue posible crear el bundle en Tutor LMS.",
  paquete: "No fue posible eliminar el paquete.",
  paquete_asignado: "No puedes eliminar un paquete activo en una empresa.",
  asignacion: "No fue posible asignar el paquete.",
  sync: "No fue posible sincronizar. Revisa que exista paquete activo y empleados con WP user ID.",
}

const sheetErrors = new Set(["datos", "cursos", "bundle"])

const thClass = "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminPaquetesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  const { paquetes, empresas, dc3MetadataByCourseId } = await getSuperadminPaquetesSnapshot()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="SuperAdmin · Operaciones"
        title="Gestión de paquetes"
        description="Define paquetes con cursos de Tutor LMS, asígnalos a empresas y sincroniza empleados."
      />

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{successMessages[success] ?? success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            {detail ? `${errorMessages[error] ?? error} — ${detail}` : (errorMessages[error] ?? error)}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <CreatePaqueteSheet defaultOpen={!!error && sheetErrors.has(error)} />
      </div>

      <PanelBox
        title="Catálogo de paquetes"
        description="Cursos por paquete, estado DC-3 y empresas asignadas."
        noPadding
      >
        {paquetes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Package size={28} className="text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">Aún no hay paquetes registrados.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {paquetes.map((paquete) => (
              <PaqueteCard key={paquete.id} paquete={paquete} dc3MetadataByCourseId={dc3MetadataByCourseId} />
            ))}
          </div>
        )}
      </PanelBox>

      <PanelBox
        title="Asignación por empresa"
        description="Asigna el paquete activo de cada empresa y sincroniza con sus empleados."
        noPadding
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              <TableHead className={thClass}>Empresa</TableHead>
              <TableHead className={thClass}>Paquete activo</TableHead>
              <TableHead className={thClass}>Cambiar paquete</TableHead>
              <TableHead className={cn(thClass, "hidden sm:table-cell")}>Empleados</TableHead>
              <TableHead className={cn(thClass, "text-right")}>Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => {
              const activePackage = empresa.paquetes[0]?.paquete
              const syncable = empresa.empleados.filter((e) => e.wp_user_id).length

              return (
                <TableRow key={empresa.id} className="hover:bg-muted/40">
                  <TableCell className="text-[13px] font-medium text-foreground">
                    {empresa.nombre}
                  </TableCell>
                  <TableCell>
                    {activePackage ? (
                      <Badge variant="secondary">{activePackage.nombre}</Badge>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">Sin paquete</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={assignPackageToCompanyAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="empresa_id" value={empresa.id} />
                      <select
                        name="paquete_id"
                        required
                        aria-label="Paquete"
                        defaultValue={empresa.paquetes[0]?.paquete_id ?? ""}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="" disabled>Selecciona un paquete</option>
                        {paquetes.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        name="fecha_vencimiento"
                        aria-label="Fecha de vencimiento"
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <Button type="submit" size="sm" className="bg-brand text-brand-ink hover:bg-brand/90">
                        Asignar
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-[12px] text-muted-foreground">
                      {empresa.empleados.length} empleados · {syncable} con WP ID
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={syncPackageToCompanyEmployeesAction}>
                      <input type="hidden" name="empresa_id" value={empresa.id} />
                      <Button variant="outline" size="sm" type="submit" className="gap-1.5">
                        <RotateCw size={11} />
                        Sincronizar
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </PanelBox>
    </div>
  )
}
