"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

type EmpresaResult = { id: number; nombre: string; activo: boolean }
type EmpleadoResult = {
  id: number
  nombre: string
  apellido: string
  email: string
  empresa: { nombre: string }
}
type PaqueteResult = { id: number; nombre: string; activo: boolean }

type SearchResults = {
  empresas: EmpresaResult[]
  empleados: EmpleadoResult[]
  paquetes: PaqueteResult[]
}

export default function SuperadminSearchBar() {
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
      const res = await fetch(`/api/internal/superadmin-search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return
      const data: SearchResults = await res.json()
      setResults(data)
      setOpen(true)
    } catch {
      // silently fail — search is non-critical
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
    results &&
    (results.empresas.length > 0 ||
      results.empleados.length > 0 ||
      results.paquetes.length > 0)

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
          onFocus={() => {
            if (hasResults) setOpen(true)
          }}
          placeholder="Buscar empresas, empleados o paquetes..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
              {results!.empresas.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Empresas
                  </p>
                  {results!.empresas.map((e) => (
                    <Link
                      key={e.id}
                      href="/superadmin/empresas"
                      onClick={handleClose}
                      className="flex items-center justify-between px-4 py-2.5 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{e.nombre}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          e.activo
                            ? "bg-teal-100 text-teal-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {e.activo ? "Activa" : "Suspendida"}
                      </span>
                    </Link>
                  ))}
                </section>
              )}

              {results!.empleados.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Empleados
                  </p>
                  {results!.empleados.map((e) => (
                    <Link
                      key={e.id}
                      href="/superadmin/accesos"
                      onClick={handleClose}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {e.nombre} {e.apellido}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {e.email} · {e.empresa.nombre}
                        </p>
                      </div>
                    </Link>
                  ))}
                </section>
              )}

              {results!.paquetes.length > 0 && (
                <section>
                  <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Paquetes
                  </p>
                  {results!.paquetes.map((p) => (
                    <Link
                      key={p.id}
                      href="/superadmin/paquetes"
                      onClick={handleClose}
                      className="flex items-center justify-between px-4 py-2.5 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{p.nombre}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.activo
                            ? "bg-teal-100 text-teal-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
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
