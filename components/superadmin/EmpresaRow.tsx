import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { getInitials } from "@/components/portal/nav-config"
import { SeatDonut } from "@/components/superadmin/SeatDonut"
import { SuspendCompanyButton } from "@/components/superadmin/SuspendCompanyButton"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { getSuperadminEmpresasSnapshot } from "@/lib/dashboard-cache"
import { formatDate } from "@/lib/format"

type Empresa = Awaited<ReturnType<typeof getSuperadminEmpresasSnapshot>>["empresas"][number]

export function EmpresaRow({ empresa }: { empresa: Empresa }) {
  const paquete = empresa.paquetes[0]?.paquete?.nombre ?? "—"
  const activos = empresa.empleados.filter((e) => e.activo).length

  return (
    <TableRow className="hover:bg-muted/40">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-[12px] font-bold text-brand">
            {getInitials(empresa.nombre)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{empresa.nombre}</p>
            <p className="truncate text-[11px] text-muted-foreground">{empresa.email_rh}</p>
          </div>
        </div>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <span className="font-mono text-[12px] text-muted-foreground">{empresa.rfc ?? "—"}</span>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <Badge variant="secondary" className="text-[11px]">{paquete}</Badge>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <SeatDonut used={activos} total={empresa.asientos_contratados} size={48} />
          <span className="text-[12px] font-medium text-foreground">
            {activos}<span className="text-muted-foreground">/{empresa.asientos_contratados}</span>
          </span>
        </div>
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <span className="text-[12px] text-muted-foreground">{formatDate(empresa.created_at)}</span>
      </TableCell>

      <TableCell>
        {empresa.activo ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
            <span className="size-1.5 rounded-full bg-green-500" />
            Activa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-slate-300" />
            Suspendida
          </span>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/superadmin/empresas/${empresa.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink size={11} strokeWidth={2} />
            Ver
          </Link>
          <SuspendCompanyButton empresaId={empresa.id} activo={empresa.activo} nombre={empresa.nombre} />
        </div>
      </TableCell>
    </TableRow>
  )
}
