"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

type CursoResult = {
  id: number
  nombre_curso: string
  progreso_pct: number
  completado: boolean
}
type ConstanciaResult = {
  id: number
  nombre_curso: string
  folio: string
}

type SearchResults = {
  cursos: CursoResult[]
  constancias: ConstanciaResult[]
}

export default function EmpleadoSearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/internal/empleado-search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return
      const data: SearchResults = await res.json()
      setResults(data)
      setOpen(true)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function handleClose() {
    setOpen(false)
    setQuery("")
    setResults(null)
  }

  const hasResults =
    results && (results.cursos.length > 0 || results.constancias.length > 0)

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true) }}
          placeholder="Buscar cursos o constancias..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          aria-label="Buscar en el portal"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {hasResults ? (
            <>
              {results!.cursos.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Mis cursos
                  </p>
                  {results!.cursos.map((c) => (
                    <Link
                      key={c.id}
                      href="/empleado/cursos"
                      onClick={handleClose}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{c.nombre_curso}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.completado
                            ? "bg-teal-100 text-teal-800"
                            : c.progreso_pct > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.completado ? "Completado" : c.progreso_pct > 0 ? `${c.progreso_pct}%` : "Sin iniciar"}
                      </span>
                    </Link>
                  ))}
                </section>
              )}

              {results!.constancias.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Constancias
                  </p>
                  {results!.constancias.map((c) => (
                    <Link
                      key={c.id}
                      href="/empleado/constancias"
                      onClick={handleClose}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{c.nombre_curso}</p>
                      <span className="shrink-0 font-mono text-xs text-slate-400">{c.folio}</span>
                    </Link>
                  ))}
                </section>
              )}
              <div className="h-2" />
            </>
          ) : (
            <p className="px-4 py-5 text-center text-sm text-slate-500">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  )
}
