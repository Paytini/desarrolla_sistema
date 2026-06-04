"use client"

import Link from "next/link"
import SearchPalette from "./SearchPalette"
import { Building2, Package, Users } from "lucide-react"

type EmpresaResult  = { id: number; nombre: string; activo: boolean }
type EmpleadoResult = { id: number; nombre: string; apellido: string; email: string; empresa: { nombre: string } }
type PaqueteResult  = { id: number; nombre: string; activo: boolean }
type SearchResults  = { empresas: EmpresaResult[]; empleados: EmpleadoResult[]; paquetes: PaqueteResult[] }

export default function SuperadminSearchBar() {
  return (
    <SearchPalette<SearchResults>
      searchUrl={(q) => `/api/internal/superadmin-search?q=${encodeURIComponent(q)}`}
      placeholder="Buscar empresas, empleados, paquetes..."
      triggerLabel="Buscar en el portal"
      renderGroups={(results, query, onClose) => {
        const hasResults =
          results.empresas.length > 0 ||
          results.empleados.length > 0 ||
          results.paquetes.length > 0

        if (!hasResults) {
          return (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-muted-foreground">
                Sin resultados para{" "}
                <span className="font-medium text-foreground">"{query}"</span>
              </p>
            </div>
          )
        }

        return (
          <div className="py-2">
            {results.empresas.length > 0 && (
              <section>
                <GroupHeader icon={Building2} label="Empresas" count={results.empresas.length} />
                {results.empresas.map((e) => (
                  <Link
                    key={e.id}
                    href={`/superadmin/empresas/${e.id}`}
                    data-palette-item=""
                    tabIndex={0}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar letter={e.nombre[0]} color="blue" />
                      <p className="text-[13px] font-medium text-foreground">{e.nombre}</p>
                    </div>
                    <StatusPill active={e.activo} activeLabel="Activa" inactiveLabel="Suspendida" />
                  </Link>
                ))}
              </section>
            )}

            {results.empleados.length > 0 && (
              <section>
                <GroupHeader icon={Users} label="Empleados" count={results.empleados.length} />
                {results.empleados.map((e) => (
                  <Link
                    key={e.id}
                    href="/superadmin/accesos"
                    data-palette-item=""
                    tabIndex={0}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar letter={e.nombre[0]} color="slate" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground">
                          {e.nombre} {e.apellido}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {e.email} · {e.empresa.nombre}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {results.paquetes.length > 0 && (
              <section>
                <GroupHeader icon={Package} label="Paquetes" count={results.paquetes.length} />
                {results.paquetes.map((p) => (
                  <Link
                    key={p.id}
                    href="/superadmin/paquetes"
                    data-palette-item=""
                    tabIndex={0}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar letter={p.nombre[0]} color="orange" />
                      <p className="text-[13px] font-medium text-foreground">{p.nombre}</p>
                    </div>
                    <StatusPill active={p.activo} activeLabel="Activo" inactiveLabel="Inactivo" />
                  </Link>
                ))}
              </section>
            )}
          </div>
        )
      }}
    />
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function GroupHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType
  label: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2 px-4 pb-1 pt-3">
      <Icon size={11} strokeWidth={2.5} className="text-muted-foreground/60" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
        {label}
      </span>
      <span className="ml-0.5 tabular-nums text-[10px] text-muted-foreground/50">({count})</span>
    </div>
  )
}

function Avatar({ letter, color }: { letter: string; color: "blue" | "slate" | "orange" }) {
  const cls = {
    blue:   "bg-primary/10 text-primary",
    slate:  "bg-slate-100 text-slate-500",
    orange: "bg-orange-100 text-orange-600",
  }[color]
  return (
    <span className={`flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold ${cls}`}>
      {letter.toUpperCase()}
    </span>
  )
}

function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean
  activeLabel: string
  inactiveLabel: string
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
