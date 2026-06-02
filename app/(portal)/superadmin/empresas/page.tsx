import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Building2, CheckCircle2, Clock, Plus, Users } from "lucide-react"
import Link from "next/link"
import {
  createCompanyAction,
  toggleCompanyStatusAction,
  updateCompanySeatsAction,
} from "./actions"

const successMessages: Record<string, string> = {
  empresa_creada: "La empresa se creó correctamente con su usuario RH inicial.",
  empresa_suspendida: "La empresa fue suspendida.",
  empresa_activada: "La empresa fue reactivada correctamente.",
  cupos_actualizados: "Los cupos contratados se actualizaron correctamente.",
}

const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios para crear la empresa.",
  email_rh: "Ese correo RH ya está ligado a una empresa.",
  usuario_rh: "Ese correo ya existe como usuario del portal.",
  empresa: "No se encontró la empresa solicitada.",
  cupos: "No fue posible actualizar cupos.",
  cupos_menor_uso: "No puedes reducir cupos por debajo de los actualmente usados.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmpresasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success = readSearchParam(params, "success")
  const error = readSearchParam(params, "error")

  const { empresas, paquetes } = await getSuperadminEmpresasSnapshot()

  const empresasActivas = empresas.filter((e) => e.activo).length
  const cuposVendidos = empresas.reduce((t, e) => t + e.asientos_contratados, 0)
  const cuposUsados = empresas.reduce((t, e) => t + e.asientos_usados, 0)
  const colaboradoresSuspendidos = empresas.reduce(
    (t, e) => t + e.empleados.filter((emp) => !emp.activo).length,
    0
  )
  const occupancyPct = cuposVendidos ? Math.round((cuposUsados / cuposVendidos) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Administración</p>
          <h1 className="text-2xl font-bold text-slate-950">Empresas clientes</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gestiona las organizaciones activas en la plataforma.</p>
        </div>
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
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Empresas activas", value: empresasActivas, sub: `${empresas.length} registradas en total`, icon: Building2, cls: "bg-[#fff2eb] text-[#F5853F]" },
          { label: "Cupos vendidos", value: cuposVendidos, sub: "Capacidad comprometida total", icon: Users, cls: "bg-slate-100 text-slate-600" },
          { label: "Cupos en uso", value: `${cuposUsados} · ${occupancyPct}%`, sub: "Ocupación global de la plataforma", icon: Clock, cls: "bg-amber-50 text-amber-600" },
          { label: "Colaboradores suspendidos", value: colaboradoresSuspendidos, sub: "Sin acceso activo", icon: AlertCircle, cls: colaboradoresSuspendidos > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500" },
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

      {/* Main content */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Alta de empresa */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px]">Alta de empresa</CardTitle>
            <CardDescription>
              Crea la empresa, su usuario RH primario y opcionalmente asigna el paquete inicial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCompanyAction} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="nombre" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre de la empresa *</Label>
                  <Input id="nombre" name="nombre" required placeholder="Ej: TechCorp MX" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email_rh" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Correo RH *</Label>
                  <Input id="email_rh" name="email_rh" type="email" required placeholder="rh@empresa.com" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="nombre_rh" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre responsable RH *</Label>
                  <Input id="nombre_rh" name="nombre_rh" required placeholder="María González" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password_rh" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Password temporal RH *</Label>
                  <Input id="password_rh" name="password_rh" type="password" minLength={8} required placeholder="Mín. 8 caracteres" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="telefono" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Teléfono</Label>
                  <Input id="telefono" name="telefono" placeholder="55 1234 5678" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rfc" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">RFC</Label>
                  <Input id="rfc" name="rfc" placeholder="XAXX010101000" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="asientos_contratados" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cupos *</Label>
                  <Input id="asientos_contratados" name="asientos_contratados" type="number" min={1} defaultValue={25} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="paquete_id" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paquete inicial</Label>
                  <select
                    id="paquete_id"
                    name="paquete_id"
                    defaultValue=""
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sin asignar todavía</option>
                    {paquetes.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha_vencimiento" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vigencia del paquete</Label>
                  <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notas" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notas internas</Label>
                <Textarea id="notas" name="notas" rows={3} placeholder="Observaciones o acuerdos comerciales…" />
              </div>
              <div>
                <Button type="submit" className="gap-2 bg-[#F5853F] hover:bg-[#D96B20]">
                  <Plus size={14} strokeWidth={2.5} />
                  Crear empresa y acceso RH
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de empresas */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">Empresas registradas</CardTitle>
                <CardDescription>Vista operativa con cupos, paquete activo y acciones rápidas.</CardDescription>
              </div>
              <Badge variant="secondary">{empresas.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {empresas.length === 0 ? (
              <div className="px-6 pb-6">
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <Building2 size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">Aún no hay empresas registradas.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cupos</TableHead>
                    <TableHead>Paquete</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa) => {
                    const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "—"
                    const empleadosActivos = empresa.empleados.filter((e) => e.activo).length
                    const ocupacionPct = empresa.asientos_contratados
                      ? Math.round((empleadosActivos / empresa.asientos_contratados) * 100)
                      : 0
                    const barColor = ocupacionPct >= 80 ? "bg-rose-400" : ocupacionPct >= 60 ? "bg-amber-400" : "bg-[#F5853F]"

                    return (
                      <TableRow key={empresa.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-950">{empresa.nombre}</p>
                            <p className="text-xs text-slate-400">{empresa.email_rh}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={empresa.activo ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
                            {empresa.activo ? "Activa" : "Suspendida"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-700">{empleadosActivos}/{empresa.asientos_contratados}</p>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${ocupacionPct}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">{paquete}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-400">{formatDate(empresa.created_at)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/superadmin/empresas/${empresa.id}`}
                              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                            >
                              Ver →
                            </Link>
                            <form action={updateCompanySeatsAction} className="flex items-center gap-1">
                              <input type="hidden" name="empresa_id" value={empresa.id} />
                              <Input
                                name="asientos_contratados"
                                type="number"
                                min={Math.max(empleadosActivos, 1)}
                                defaultValue={empresa.asientos_contratados}
                                className="h-8 w-16 text-xs"
                              />
                              <Button variant="outline" size="sm" type="submit">↑</Button>
                            </form>
                            <form action={toggleCompanyStatusAction}>
                              <input type="hidden" name="empresa_id" value={empresa.id} />
                              <Button
                                variant={empresa.activo ? "destructive" : "default"}
                                size="sm"
                                type="submit"
                                className={empresa.activo ? "" : "bg-[#F5853F] hover:bg-[#D96B20]"}
                              >
                                {empresa.activo ? "Suspender" : "Reactivar"}
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
