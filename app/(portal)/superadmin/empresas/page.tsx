import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"
import { readSearchParam } from "@/lib/search-params"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { StatCard } from "@/components/superadmin/StatCard"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { AlertCircle, Building2, CheckCircle2, ExternalLink, Plus } from "lucide-react"
import Link from "next/link"
import {
  createCompanyAction,
  toggleCompanyStatusAction,
  updateCompanySeatsAction,
} from "./actions"

const successMessages: Record<string, string> = {
  empresa_creada:     "Empresa creada correctamente con su usuario RH inicial.",
  empresa_suspendida: "Empresa suspendida.",
  empresa_activada:   "Empresa reactivada correctamente.",
  cupos_actualizados: "Cupos actualizados correctamente.",
}
const errorMessages: Record<string, string> = {
  datos:          "Faltan datos obligatorios.",
  email_rh:       "Ese correo RH ya está ligado a una empresa.",
  usuario_rh:     "Ese correo ya existe como usuario del portal.",
  empresa:        "No se encontró la empresa.",
  cupos:          "No fue posible actualizar cupos.",
  cupos_menor_uso:"No puedes reducir cupos por debajo de los actualmente usados.",
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmpresasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success      = readSearchParam(params, "success")
  const error        = readSearchParam(params, "error")
  const q            = readSearchParam(params, "q")?.toLowerCase() ?? ""
  const statusFilter = readSearchParam(params, "status") ?? "all"

  const { empresas, paquetes } = await getSuperadminEmpresasSnapshot()

  const empresasFiltradas = empresas.filter((e) => {
    const matchQ =
      q
        ? e.nombre.toLowerCase().includes(q) ||
          (e.rfc?.toLowerCase().includes(q) ?? false) ||
          e.email_rh.toLowerCase().includes(q)
        : true
    const matchStatus =
      statusFilter === "activa"    ? e.activo  :
      statusFilter === "suspendida"? !e.activo :
      true
    return matchQ && matchStatus
  })

  const empresasActivas = empresas.filter((e) => e.activo).length
  const cuposVendidos   = empresas.reduce((t, e) => t + e.asientos_contratados, 0)
  const cuposUsados     = empresas.reduce((t, e) => t + e.asientos_usados, 0)
  const occupancyPct    = cuposVendidos ? Math.round((cuposUsados / cuposVendidos) * 100) : 0

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "#94a3b8" }}
        >
          SuperAdmin · Administración
        </p>
        <h1 className="mt-0.5 text-[22px] font-semibold leading-tight" style={{ color: "#0f172a" }}>
          Empresas clientes
        </h1>
        <p className="mt-0.5 text-[13px]" style={{ color: "#94a3b8" }}>
          Gestiona las organizaciones activas en la plataforma.
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
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Empresas activas"
          value={String(empresasActivas)}
          sub={`${empresas.length} registradas`}
        />
        <StatCard
          label="Cupos vendidos"
          value={String(cuposVendidos)}
          sub="Capacidad comprometida"
        />
        <StatCard
          label="Ocupación global"
          value={`${occupancyPct}%`}
          sub={`${cuposUsados} en uso`}
          alert={occupancyPct >= 90}
        />
        <StatCard
          label="Paquetes activos"
          value={String(paquetes.length)}
          sub="En catálogo"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">

        {/* ── Alta de empresa ── */}
        <PanelBox title="Alta de empresa" description="Crea la empresa y su usuario RH primario.">
          <form action={createCompanyAction} className="p-5">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Nombre *
                  </Label>
                  <Input name="nombre" required placeholder="CEMEX S.A. de C.V." />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Correo RH *
                  </Label>
                  <Input name="email_rh" type="email" required placeholder="rh@empresa.com" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Responsable RH *
                  </Label>
                  <Input name="nombre_rh" required placeholder="María González" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Password temporal *
                  </Label>
                  <Input name="password_rh" type="password" minLength={8} required placeholder="Mín. 8 caracteres" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Teléfono
                  </Label>
                  <Input name="telefono" placeholder="55 1234 5678" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    RFC
                  </Label>
                  <Input name="rfc" placeholder="XAXX010101000" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Cupos *
                  </Label>
                  <Input name="asientos_contratados" type="number" min={1} defaultValue={25} required />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Paquete inicial
                  </Label>
                  <select
                    name="paquete_id"
                    defaultValue=""
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sin asignar</option>
                    {paquetes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                    Vigencia
                  </Label>
                  <Input name="fecha_vencimiento" type="date" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#94a3b8" }}>
                  Notas internas
                </Label>
                <Textarea name="notas" rows={2} placeholder="Observaciones o notas del contrato…" />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                style={{ background: "#1a4f8a", color: "#fff" }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Crear empresa
              </Button>
            </div>
          </form>
        </PanelBox>

        {/* ── Tabla de empresas ── */}
        <PanelBox
          title="Empresas registradas"
          description={`${empresasFiltradas.length} resultado${empresasFiltradas.length !== 1 ? "s" : ""}${q || statusFilter !== "all" ? " · filtro activo" : ""}`}
          noPadding
          action={
            <form method="GET" className="flex items-center gap-2">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Buscar empresa o RFC…"
                className="h-8 w-44 text-[13px]"
              />
              <select
                name="status"
                defaultValue={statusFilter}
                className="flex h-8 rounded-md border border-input bg-transparent px-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="activa">Activas</option>
                <option value="suspendida">Suspendidas</option>
              </select>
              <Button type="submit" variant="outline" size="sm" className="h-8 px-3 text-[13px]">
                Filtrar
              </Button>
            </form>
          }
        >
          {empresasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 size={28} style={{ color: "#e2e8f0" }} />
              <p className="text-[13px]" style={{ color: "#94a3b8" }}>
                {q || statusFilter !== "all"
                  ? "Sin resultados para ese filtro."
                  : "Aún no hay empresas registradas."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow
                  className="hover:bg-transparent"
                  style={{ background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}
                >
                  {["Empresa", "RFC", "Plan", "Cupos", "Alta", "Estado", ""].map((h) => (
                    <TableHead
                      key={h}
                      className={h === "" ? "text-right" : ""}
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#94a3b8",
                      }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresasFiltradas.map((empresa) => {
                  const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "—"
                  const activos = empresa.empleados.filter((e) => e.activo).length
                  const pct = empresa.asientos_contratados
                    ? Math.round((activos / empresa.asientos_contratados) * 100)
                    : 0
                  const barColor =
                    pct >= 90 ? "#dc2626" :
                    pct >= 70 ? "#d97706" :
                    "#1a4f8a"

                  return (
                    <TableRow
                      key={empresa.id}
                      className="h-12 transition-colors hover:bg-slate-50/60"
                      style={{ borderBottom: "1px solid #f8fafc" }}
                    >
                      <TableCell>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#0f172a" }}>
                            {empresa.nombre}
                          </p>
                          <p className="text-[11px]" style={{ color: "#94a3b8" }}>
                            {empresa.email_rh}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[12px]" style={{ color: "#64748b" }}>
                          {empresa.rfc ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px]" style={{ color: "#64748b" }}>
                          {paquete}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-[12px] font-medium" style={{ color: "#334155" }}>
                            {activos}
                            <span style={{ color: "#94a3b8" }}>/{empresa.asientos_contratados}</span>
                          </p>
                          <div className="h-1 w-14 overflow-hidden rounded-full" style={{ background: "#f1f5f9" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px]" style={{ color: "#94a3b8" }}>
                          {formatDate(empresa.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {empresa.activo ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
                          >
                            <span className="size-1.5 rounded-full bg-green-500" />
                            Activa
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
                          >
                            <span className="size-1.5 rounded-full bg-slate-300" />
                            Suspendida
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/superadmin/empresas/${empresa.id}`}
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium transition-colors"
                            style={{
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                              color: "#475569",
                            }}
                          >
                            <ExternalLink size={11} strokeWidth={2} />
                            Ver
                          </Link>
                          <form action={updateCompanySeatsAction} className="flex items-center gap-1">
                            <input type="hidden" name="empresa_id" value={empresa.id} />
                            <Input
                              name="asientos_contratados"
                              type="number"
                              min={Math.max(activos, 1)}
                              defaultValue={empresa.asientos_contratados}
                              className="h-7 w-14 text-[12px]"
                            />
                            <Button variant="outline" size="sm" type="submit" className="h-7 px-2 text-[12px]">
                              ↑
                            </Button>
                          </form>
                          <form action={toggleCompanyStatusAction}>
                            <input type="hidden" name="empresa_id" value={empresa.id} />
                            <Button
                              size="sm"
                              type="submit"
                              className="h-7 px-2.5 text-[12px]"
                              style={
                                empresa.activo
                                  ? { background: "#0f172a", color: "#fff" }
                                  : { background: "#1a4f8a", color: "#fff" }
                              }
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
        </PanelBox>
      </div>
    </div>
  )
}
