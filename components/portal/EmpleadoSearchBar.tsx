"use client"

import Link from "next/link"
import SearchPalette from "./SearchPalette"
import { Award, BookOpen } from "lucide-react"

type CursoResult      = { id: number; nombre_curso: string; progreso_pct: number; completado: boolean }
type ConstanciaResult = { id: number; nombre_curso: string; folio: string }
type SearchResults    = { cursos: CursoResult[]; constancias: ConstanciaResult[] }

export default function EmpleadoSearchBar() {
  return (
    <SearchPalette<SearchResults>
      searchUrl={(q) => `/api/internal/empleado-search?q=${encodeURIComponent(q)}`}
      placeholder="Buscar cursos o constancias..."
      triggerLabel="Buscar mis cursos"
      renderGroups={(results, query, onClose) => {
        const hasResults = results.cursos.length > 0 || results.constancias.length > 0

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
            {results.cursos.length > 0 && (
              <section>
                <GroupHeader icon={BookOpen} label="Mis cursos" count={results.cursos.length} />
                {results.cursos.map((c) => (
                  <Link
                    key={c.id}
                    href="/empleado/cursos"
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
                    <ProgressChip curso={c} />
                  </Link>
                ))}
              </section>
            )}

            {results.constancias.length > 0 && (
              <section>
                <GroupHeader icon={Award} label="Constancias" count={results.constancias.length} />
                {results.constancias.map((c) => (
                  <Link
                    key={c.id}
                    href="/empleado/constancias"
                    data-palette-item=""
                    tabIndex={0}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-green-100">
                        <Award size={11} strokeWidth={2} className="text-green-600" />
                      </span>
                      <p className="text-[13px] font-medium text-foreground">{c.nombre_curso}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{c.folio}</span>
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

function ProgressChip({ curso }: { curso: CursoResult }) {
  if (curso.completado) {
    return (
      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        Completado
      </span>
    )
  }
  if (curso.progreso_pct > 0) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        {curso.progreso_pct}%
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
      Sin iniciar
    </span>
  )
}
