import { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { readSearchParam } from "@/lib/search-params"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateEmpresaSheet } from "@/components/superadmin/CreateEmpresaSheet"
import { EmpresaRow } from "@/components/superadmin/EmpresaRow"
import { PanelBox } from "@/components/superadmin/PanelBox"
import { PageHeader } from "@/components/superadmin/PageHeader"
import { AlertCircle, Building2, CheckCircle2, Search, X } from "lucide-react"
import Link from "next/link"

const successMessages: Record<string, string> = {
  empresa_creada:     "Empresa creada correctamente con su usuario RH inicial.",
  empresa_suspendida: "Empresa suspendida.",
  empresa_activada:   "Empresa reactivada correctamente.",
}
const errorMessages: Record<string, string> = {
  datos:      "Faltan datos obligatorios.",
  email_rh:   "Ese correo RH ya está ligado a una empresa.",
  usuario_rh: "Ese correo ya existe como usuario del portal.",
  empresa:    "No se encontró la empresa.",
}

const thClass = "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const PAGE_SIZE = 20

export default async function EmpresasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const success      = readSearchParam(params, "success")
  const error        = readSearchParam(params, "error")
  const q            = readSearchParam(params, "q")?.toLowerCase() ?? ""
  const statusFilter = readSearchParam(params, "status") ?? "all"
  const page         = Math.max(1, Number(readSearchParam(params, "page") ?? "1"))

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

  const totalPages    = Math.max(1, Math.ceil(empresasFiltradas.length / PAGE_SIZE))
  const currentPage   = Math.min(page, totalPages)
  const empresasPagina = empresasFiltradas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function pageUrl(p: number) {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (statusFilter !== "all") qs.set("status", statusFilter)
    if (p > 1) qs.set("page", String(p))
    const str = qs.toString()
    return `/superadmin/empresas${str ? `?${str}` : ""}`
  }

  return (
    <div className="space-y-6">

      <PageHeader
        breadcrumb="SuperAdmin · Administración"
        title="Empresas clientes"
        description="Gestiona las organizaciones activas en la plataforma."
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
          <AlertDescription>{errorMessages[error] ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar empresa o RFC…"
              className="h-9 w-56 pl-8 text-[13px]"
            />
          </div>
          <select
            name="status"
            defaultValue={statusFilter}
            className="flex h-9 rounded-md border border-input bg-transparent px-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Todos</option>
            <option value="activa">Activas</option>
            <option value="suspendida">Suspendidas</option>
          </select>
          <Button type="submit" variant="outline" size="sm" className="h-9 px-3 text-[13px]">
            Filtrar
          </Button>
          {(q || statusFilter !== "all") && (
            <Link
              href="/superadmin/empresas"
              className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={12} strokeWidth={2.5} />
              Limpiar
            </Link>
          )}
        </form>

        <CreateEmpresaSheet paquetes={paquetes} defaultOpen={!!error} />
      </div>

      <PanelBox
        title="Empresas registradas"
        description={`${empresasFiltradas.length} resultado${empresasFiltradas.length !== 1 ? "s" : ""}${q || statusFilter !== "all" ? " · filtro activo" : ""}${totalPages > 1 ? ` · pág. ${currentPage}/${totalPages}` : ""}`}
        noPadding
      >
        {empresasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 size={28} className="text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">
              {q || statusFilter !== "all"
                ? "Sin resultados para ese filtro."
                : "Aún no hay empresas registradas."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className={thClass}>Empresa</TableHead>
                <TableHead className={cn(thClass, "hidden sm:table-cell")}>RFC</TableHead>
                <TableHead className={cn(thClass, "hidden md:table-cell")}>Plan</TableHead>
                <TableHead className={thClass}>Cupos</TableHead>
                <TableHead className={cn(thClass, "hidden lg:table-cell")}>Alta</TableHead>
                <TableHead className={thClass}>Estado</TableHead>
                <TableHead className={cn(thClass, "text-right")}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresasPagina.map((empresa) => (
                <EmpresaRow key={empresa.id} empresa={empresa} />
              ))}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-[12px] text-muted-foreground">
              {empresasFiltradas.length} resultado{empresasFiltradas.length !== 1 ? "s" : ""} · página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              {currentPage > 1 ? (
                <Link
                  href={pageUrl(currentPage - 1)}
                  className="inline-flex h-7 items-center rounded-md border border-input bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className="inline-flex h-7 items-center rounded-md border border-input px-3 text-[12px] text-muted-foreground opacity-50 cursor-not-allowed">
                  ← Anterior
                </span>
              )}
              {currentPage < totalPages ? (
                <Link
                  href={pageUrl(currentPage + 1)}
                  className="inline-flex h-7 items-center rounded-md border border-input bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Siguiente →
                </Link>
              ) : (
                <span className="inline-flex h-7 items-center rounded-md border border-input px-3 text-[12px] text-muted-foreground opacity-50 cursor-not-allowed">
                  Siguiente →
                </span>
              )}
            </div>
          </div>
        )}
      </PanelBox>
    </div>
  )
}
