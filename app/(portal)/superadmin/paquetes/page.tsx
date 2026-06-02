import FirmaInstructorUpload from "@/components/portal/FirmaInstructorUpload"
import DeletePackageButton from "@/components/portal/DeletePackageButton"
import PackageCourseSelector from "@/components/portal/PackageCourseSelector"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getSuperadminPaquetesSnapshot } from "@/lib/dashboard-cache"
import { decodeHtmlEntities, formatDate } from "@/lib/format"
import { readDecodedSearchParam, readSearchParam } from "@/lib/search-params"
import { AlertCircle, BookOpen, Building2, CheckCircle2, Package, RotateCw } from "lucide-react"
import {
  assignPackageToCompanyAction,
  createPackageAction,
  deletePackageAction,
  syncCourseDc3MetadataAction,
  syncPackageToCompanyEmployeesAction,
  updateCourseDc3MetadataAction,
} from "./actions"

const successMessages: Record<string, string> = {
  paquete_creado: "El paquete se creó correctamente.",
  paquete_eliminado: "El paquete se eliminó del catálogo.",
  paquete_asignado: "El paquete activo de la empresa se actualizó correctamente.",
  sync_ok: "Se sincronizaron los cursos con los empleados activos.",
  dc3_actualizado: "La ficha DC-3 del curso se actualizó.",
  dc3_sync_ok: "La ficha DC-3 se sincronizó desde WordPress/Tutor LMS.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para crear el paquete.",
  cursos: "Debes seleccionar al menos un curso.",
  bundle: "No fue posible crear el bundle en Tutor LMS.",
  paquete: "No fue posible eliminar el paquete.",
  paquete_asignado: "No puedes eliminar un paquete activo en una empresa.",
  asignacion: "No fue posible asignar el paquete.",
  sync: "No fue posible sincronizar. Revisa que exista paquete activo y empleados con WP user ID.",
  dc3: "No fue posible guardar la ficha DC-3.",
  dc3_sync: "No fue posible sincronizar la ficha DC-3.",
}

type Dc3MetadataView = {
  wp_curso_id: number
  nombre_curso: string | null
  duracion_horas: number | null
  area_tematica_nombre: string | null
  area_tematica_clave: string | null
  agente_capacitador_nombre: string | null
  agente_capacitador_registro: string | null
  instructor_nombre: string | null
  instructor_firma_url: string | null
  fuente: string
  ultima_sincronizacion: Date | null
}

function getDc3MissingFields(metadata: Dc3MetadataView | undefined) {
  const missing: string[] = []
  if (!metadata?.duracion_horas) missing.push("duración")
  if (!metadata?.area_tematica_nombre) missing.push("área temática")
  if (!metadata?.agente_capacitador_nombre) missing.push("agente capacitador")
  if (!metadata?.instructor_nombre) missing.push("instructor")
  if (!metadata?.instructor_firma_url) missing.push("firma")
  return missing
}

function formatDurationValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return ""
  return String(value)
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SuperAdminPaquetesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")
  const detail = readDecodedSearchParam(params, "detail")

  const { paquetes, empresas, dc3MetadataByCourseId } = await getSuperadminPaquetesSnapshot()

  const totalPackages = paquetes.length
  const totalCourses = paquetes.reduce((s, p) => s + p.cursos.length, 0)
  const assignedCompanies = empresas.filter((e) => e.paquetes.length > 0).length
  const packagesWithBundle = paquetes.filter((p) => p.wp_bundle_id).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SuperAdmin</p>
        <h1 className="text-2xl font-bold text-slate-950">Gestión de paquetes</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Define paquetes con cursos de Tutor LMS, asígnalos a empresas y sincroniza empleados.
        </p>
      </div>

      {/* Alerts */}
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

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Paquetes registrados", value: totalPackages, sub: "Catálogo disponible", icon: Package, cls: "bg-[#fff2eb] text-[#F5853F]" },
          { label: "Cursos definidos", value: totalCourses, sub: "Incluidos en paquetes", icon: BookOpen, cls: "bg-amber-50 text-amber-600" },
          { label: "Empresas con paquete", value: assignedCompanies, sub: "Con paquete vigente", icon: Building2, cls: "bg-teal-50 text-teal-600" },
          { label: "Con bundle privado", value: packagesWithBundle, sub: "Referencia a bundle WP", icon: Package, cls: "bg-slate-100 text-slate-600" },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
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

      {/* Forms row */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        {/* Create package */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px]">Crear paquete</CardTitle>
            <CardDescription>
              Define el paquete y selecciona sus cursos desde el catálogo real de Tutor LMS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPackageAction} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="nombre" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre del paquete *</Label>
                <Input id="nombre" name="nombre" required placeholder="Ej: Paquete Seguridad Industrial" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="descripcion" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" rows={2} placeholder="Descripción del paquete…" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="modo_entrega" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Modo de entrega B2B</Label>
                <select
                  id="modo_entrega"
                  name="modo_entrega"
                  defaultValue="DIRECT_ENROLLMENT"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="DIRECT_ENROLLMENT">Matrícula directa por curso (Recomendado)</option>
                  <option value="PRIVATE_BUNDLE_REFERENCE">Bundle privado como referencia operativa</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="wp_bundle_id" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">WP Bundle ID</Label>
                  <Input id="wp_bundle_id" name="wp_bundle_id" type="number" min={1} placeholder="Opcional" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nombre_bundle" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre del bundle</Label>
                  <Input id="nombre_bundle" name="nombre_bundle" placeholder="Auto si se crea desde el portal" />
                </div>
              </div>
              <div className="rounded-lg border border-[#F5853F]/30 bg-[#fff2eb]/70 p-3 text-xs leading-5 text-slate-700">
                Si dejas vacío <strong>WP Bundle ID</strong>, el portal intentará crear automáticamente un bundle privado en Tutor LMS.
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notas_operativas" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notas operativas</Label>
                <Textarea id="notas_operativas" name="notas_operativas" rows={2} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cursos del paquete *</Label>
                <PackageCourseSelector />
              </div>
              <div>
                <Button type="submit" className="bg-[#F5853F] hover:bg-[#D96B20]">
                  Guardar paquete
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Assign to company */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px]">Asignar paquete a empresa</CardTitle>
            <CardDescription>
              Cambia el paquete activo y sincroniza empleados hacia Tutor LMS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={assignPackageToCompanyAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Empresa *</Label>
                <select
                  name="empresa_id"
                  required
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecciona empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paquete *</Label>
                <select
                  name="paquete_id"
                  required
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecciona paquete</option>
                  {paquetes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vigencia</Label>
                <Input name="fecha_vencimiento" type="date" className="h-9" />
              </div>
              <Button type="submit" className="sm:self-end bg-violet-700 hover:bg-violet-800">
                Asignar
              </Button>
            </form>

            <Separator />

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado por empresa</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Paquete activo</TableHead>
                  <TableHead>Empleados / WP ID</TableHead>
                  <TableHead className="text-right">Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((empresa) => {
                  const activePackage = empresa.paquetes[0]?.paquete?.nombre ?? "—"
                  const syncable = empresa.empleados.filter((e) => e.wp_user_id).length
                  return (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">{empresa.nombre}</TableCell>
                      <TableCell>
                        {empresa.paquetes.length > 0
                          ? <Badge className="bg-[#fff2eb] text-[#D96B20] hover:bg-[#fff2eb]">{activePackage}</Badge>
                          : <span className="text-xs text-slate-400">Sin paquete</span>
                        }
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{empresa.empleados.length} empleados · {syncable} con WP ID</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={syncPackageToCompanyEmployeesAction}>
                          <input type="hidden" name="empresa_id" value={empresa.id} />
                          <Button variant="outline" size="sm" type="submit" className="gap-1.5">
                            <RotateCw size={12} />
                            Sync
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Package catalog */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Catálogo de paquetes</CardTitle>
          <CardDescription>Cursos por paquete, estado DC-3 y empresas asignadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paquetes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <Package size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Aún no hay paquetes registrados.</p>
            </div>
          ) : (
            paquetes.map((paquete) => (
              <div key={paquete.id} className="rounded-lg border border-slate-200 bg-slate-50/50">
                {/* Package header */}
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{paquete.nombre}</h3>
                      <Badge variant="secondary">{paquete.cursos.length} cursos</Badge>
                    </div>
                    {paquete.descripcion && (
                      <p className="text-sm text-slate-500">{paquete.descripcion}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span><strong className="text-slate-700">Modo:</strong> {paquete.modo_entrega === "PRIVATE_BUNDLE_REFERENCE" ? "Bundle privado" : "Matrícula directa"}</span>
                      <span><strong className="text-slate-700">Empresas:</strong> {paquete.empresas.length > 0 ? paquete.empresas.map((i) => i.empresa.nombre).join(", ") : "Ninguna"}</span>
                      <span><strong className="text-slate-700">Creado:</strong> {formatDate(paquete.created_at)}</span>
                      {paquete.wp_bundle_id && (
                        <span><strong className="text-slate-700">Bundle WP:</strong> {paquete.wp_bundle_id}</span>
                      )}
                    </div>
                    {paquete.notas_operativas && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        <strong>Notas:</strong> {paquete.notas_operativas}
                      </div>
                    )}
                  </div>
                  <DeletePackageButton
                    action={deletePackageAction}
                    paqueteId={paquete.id}
                    packageName={paquete.nombre}
                    assignedCompaniesCount={paquete.empresas.length}
                  />
                </div>

                {/* Courses */}
                {paquete.cursos.length > 0 && (
                  <>
                    <Separator />
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cursos incluidos</p>
                      {paquete.cursos.map((curso) => {
                        const dc3Metadata = dc3MetadataByCourseId[String(curso.wp_curso_id)] as Dc3MetadataView | undefined
                        const missingFields = getDc3MissingFields(dc3Metadata)
                        const isDc3Ready = missingFields.length === 0

                        return (
                          <details
                            key={curso.id}
                            className="group rounded-lg border border-slate-200 bg-white"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-950">
                                  {curso.wp_curso_id} — {decodeHtmlEntities(curso.nombre_curso ?? "")}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {isDc3Ready ? "DC-3 lista para emitir constancias" : `Faltan: ${missingFields.join(", ")}`}
                                </p>
                              </div>
                              <Badge
                                className={isDc3Ready
                                  ? "shrink-0 bg-green-50 text-green-700 hover:bg-green-50"
                                  : "shrink-0 bg-amber-50 text-amber-700 hover:bg-amber-50"}
                              >
                                {isDc3Ready ? "DC-3 completo" : "DC-3 pendiente"}
                              </Badge>
                            </summary>

                            <div className="border-t border-slate-100 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <p className="text-xs text-slate-400">
                                  Fuente: <strong className="text-slate-600">{dc3Metadata?.fuente ?? "Sin capturar"}</strong>
                                  {" · "}
                                  Sync: <strong className="text-slate-600">{dc3Metadata?.ultima_sincronizacion ? formatDate(dc3Metadata.ultima_sincronizacion) : "Nunca"}</strong>
                                </p>
                                <form action={syncCourseDc3MetadataAction}>
                                  <input type="hidden" name="wp_curso_id" value={curso.wp_curso_id} />
                                  <input type="hidden" name="nombre_curso" value={curso.nombre_curso} />
                                  <Button variant="outline" size="sm" type="submit" className="gap-1.5">
                                    <RotateCw size={12} />
                                    Sync desde Tutor
                                  </Button>
                                </form>
                              </div>

                              <form action={updateCourseDc3MetadataAction} className="grid gap-4">
                                <input type="hidden" name="wp_curso_id" value={curso.wp_curso_id} />
                                <input type="hidden" name="nombre_curso" value={curso.nombre_curso} />
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Duración (horas)</Label>
                                    <Input name="duracion_horas" type="number" min={0} step="0.25" defaultValue={formatDurationValue(dc3Metadata?.duracion_horas)} placeholder="Ej. 12" />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Área temática</Label>
                                    <Input name="area_tematica_nombre" defaultValue={dc3Metadata?.area_tematica_nombre ?? ""} placeholder="Higiene y seguridad" />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Clave área temática</Label>
                                    <Input name="area_tematica_clave" defaultValue={dc3Metadata?.area_tematica_clave ?? ""} placeholder="Opcional" />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agente capacitador</Label>
                                    <Input name="agente_capacitador_nombre" defaultValue={dc3Metadata?.agente_capacitador_nombre ?? ""} placeholder="DesarrollaMX 360" />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Registro STPS / ACE</Label>
                                    <Input name="agente_capacitador_registro" defaultValue={dc3Metadata?.agente_capacitador_registro ?? ""} placeholder="Si aplica" />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Instructor / Tutor</Label>
                                    <Input name="instructor_nombre" defaultValue={dc3Metadata?.instructor_nombre ?? ""} placeholder="Nombre completo" />
                                  </div>
                                </div>
                                <FirmaInstructorUpload defaultUrl={dc3Metadata?.instructor_firma_url ?? ""} name="instructor_firma_url" />
                                <div>
                                  <Button size="sm" type="submit" className="bg-[#F5853F] hover:bg-[#D96B20]">
                                    Guardar ficha DC-3
                                  </Button>
                                </div>
                              </form>
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
