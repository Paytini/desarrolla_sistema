import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Users,
} from "lucide-react"
import Link from "next/link"
import {
  createCompanyAction,
  toggleCompanyStatusAction,
  updateCompanySeatsAction,
} from "./actions"

const successMessages: Record<string, string> = {
  empresa_creada: "Empresa creada correctamente con su usuario RH inicial.",
  empresa_suspendida: "Empresa suspendida.",
  empresa_activada: "Empresa reactivada correctamente.",
  cupos_actualizados: "Cupos actualizados correctamente.",
}
const errorMessages: Record<string, string> = {
  datos: "Faltan datos obligatorios.",
  email_rh: "Ese correo RH ya está ligado a una empresa.",
  usuario_rh: "Ese correo ya existe como usuario del portal.",
  empresa: "No se encontró la empresa.",
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
  const suspendidos = empresas.reduce((t, e) => t + e.empleados.filter((emp) => !emp.activo).length, 0)
  const occupancyPct = cuposVendidos ? Math.round((cuposUsados / cuposVendidos) * 100) : 0

  const stats = [
    { label: "Empresas activas", value: String(empresasActivas), sub: `${empresas.length} registradas`, icon: Building2, color: "#F5853F" },
    { label: "Cupos vendidos", value: String(cuposVendidos), sub: "Capacidad comprometida", icon: Users, color: "#000022" },
    { label: "Ocupación global", value: `${occupancyPct}%`, sub: `${cuposUsados} en uso`, icon: Clock, color: "#f59e0b" },
    { label: "Colaboradores suspendidos", value: String(suspendidos), sub: "Sin acceso activo", icon: AlertCircle, color: suspendidos > 0 ? "#f43f5e" : "#94a3b8" },
  ]

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[1.5px]" style={{ color: "#F5853F" }}>
            Administración
          </p>
          <h1 className="mt-0.5 text-[26px] font-bold leading-tight" style={{ color: "#130303" }}>
            Empresas clientes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona las organizaciones activas en la plataforma.
          </p>
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

      {/* Unified stat bar */}
      <div
        className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0"
      >
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-4 px-6 py-5">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}18` }}
            >
              <Icon size={18} strokeWidth={2} style={{ color }} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color: "#130303" }}>{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content: form + table */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Create form */}
        <div
          className="rounded-2xl border border-slate-200 bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,34,0.04)" }}
        >
          <h2 className="text-[15px] font-semibold" style={{ color: "#130303" }}>Alta de empresa</h2>
          <p className="mt-0.5 text-sm text-slate-500">Crea la empresa y su usuario RH primario.</p>

          <form action={createCompanyAction} className="mt-5 grid gap-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nombre *</Label>
                <Input name="nombre" required placeholder="Ej: TechCorp MX" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Correo RH *</Label>
                <Input name="email_rh" type="email" required placeholder="rh@empresa.com" />
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Responsable RH *</Label>
                <Input name="nombre_rh" required placeholder="María González" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Password temporal *</Label>
                <Input name="password_rh" type="password" minLength={8} required placeholder="Mín. 8 caracteres" />
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Teléfono</Label>
                <Input name="telefono" placeholder="55 1234 5678" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">RFC</Label>
                <Input name="rfc" placeholder="XAXX010101000" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cupos *</Label>
                <Input name="asientos_contratados" type="number" min={1} defaultValue={25} required />
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Paquete inicial</Label>
                <select
                  name="paquete_id"
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sin asignar</option>
                  {paquetes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vigencia</Label>
                <Input name="fecha_vencimiento" type="date" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notas internas</Label>
              <Textarea name="notas" rows={2} placeholder="Observaciones…" />
            </div>
            <div className="pt-1">
              <Button type="submit" className="w-full gap-2" style={{ background: "#F5853F" }}>
                <Plus size={14} strokeWidth={2.5} />
                Crear empresa
              </Button>
            </div>
          </form>
        </div>

        {/* Empresas table */}
        <div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          style={{ boxShadow: "0 1px 3px rgba(0,0,34,0.04)" }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: "#130303" }}>Empresas registradas</h2>
              <p className="text-sm text-slate-500">Vista operativa con cupos y acciones rápidas.</p>
            </div>
            <Badge variant="secondary">{empresas.length}</Badge>
          </div>

          {empresas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 size={32} className="text-slate-200" />
              <p className="text-sm text-slate-400">Aún no hay empresas registradas.</p>
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
                  const activos = empresa.empleados.filter((e) => e.activo).length
                  const pct = empresa.asientos_contratados
                    ? Math.round((activos / empresa.asientos_contratados) * 100)
                    : 0
                  const barColor = pct >= 80 ? "#f43f5e" : pct >= 60 ? "#f59e0b" : "#F5853F"

                  return (
                    <TableRow key={empresa.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium" style={{ color: "#130303" }}>{empresa.nombre}</p>
                          <p className="text-xs text-slate-400">{empresa.email_rh}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={empresa.activo
                            ? "bg-green-50 text-green-700 hover:bg-green-50"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-100"}
                        >
                          {empresa.activo ? "Activa" : "Suspendida"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium" style={{ color: "#130303" }}>
                            {activos}/{empresa.asientos_contratados}
                          </p>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/superadmin/empresas/${empresa.id}`}
                            className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Ver
                          </Link>
                          <form action={updateCompanySeatsAction} className="flex items-center gap-1">
                            <input type="hidden" name="empresa_id" value={empresa.id} />
                            <Input
                              name="asientos_contratados"
                              type="number"
                              min={Math.max(activos, 1)}
                              defaultValue={empresa.asientos_contratados}
                              className="h-7 w-14 text-xs"
                            />
                            <Button variant="outline" size="sm" type="submit" className="h-7 px-2 text-xs">
                              ↑
                            </Button>
                          </form>
                          <form action={toggleCompanyStatusAction}>
                            <input type="hidden" name="empresa_id" value={empresa.id} />
                            <Button
                              size="sm"
                              type="submit"
                              className="h-7 px-2.5 text-xs"
                              style={empresa.activo
                                ? { background: "#130303", color: "#fff" }
                                : { background: "#F5853F", color: "#fff" }}
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
        </div>
      </div>
    </div>
  )
}
