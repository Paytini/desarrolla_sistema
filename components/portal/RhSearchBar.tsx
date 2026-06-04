"use client"

import Link from "next/link"
import SearchPalette from "./SearchPalette"
import { BookOpen, Users } from "lucide-react"

type EmpleadoResult = { id: number; nombre: string; apellido: string; email: string; departamento: string | null }
type CursoResult    = { wp_curso_id: number; nombre_curso: string }
type SearchResults  = { empleados: EmpleadoResult[]; cursos: CursoResult[] }

export default function RhSearchBar() {
  return (
    <SearchPalette<SearchResults>
      searchUrl={(q) => `/api/internal/rh-search?q=${encodeURIComponent(q)}`}
      placeholder="Buscar empleados o cursos..."
      triggerLabel="Buscar en el portal"
      renderGroups={(results, query, onClose) => {
        const hasResults = results.empleados.length > 0 || results.cursos.length > 0

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
            {results.empleados.length > 0 && (
              <section>
                <GroupHeader icon={Users} label="Empleados" count={results.empleados.length} />
                {results.empleados.map((e) => (
                  <Link
                    key={e.id}
                    href="/empresa/empleados"
                    data-palette-item=""
                    tabIndex={0}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-bold text-slate-500">
                      {e.nombre[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">
                        {e.nombre} {e.apellido}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {e.email}
                        {e.departamento ? ` · ${e.departamento}` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {results.cursos.length > 0 && (
              <section>
                <GroupHeader icon={BookOpen} label="Cursos del paquete" count={results.cursos.length} />
                {results.cursos.map((c) => (
                  <Link
                    key={c.wp_curso_id}
                    href="/empresa/progreso"
                    data-palette-item=""
                    tabIndex={0}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10">
                        <BookOpen size={11} strokeWidth={2} className="text-primary" />
                      </span>
                      <p className="text-[13px] font-medium text-foreground">{c.nombre_curso}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      ID {c.wp_curso_id}
                    </span>
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

function GroupHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-1 pt-3">
      <Icon size={11} strokeWidth={2.5} className="text-muted-foreground/60" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">{label}</span>
      <span className="ml-0.5 tabular-nums text-[10px] text-muted-foreground/50">({count})</span>
    </div>
  )
}
