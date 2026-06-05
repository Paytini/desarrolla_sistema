"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Loader2, Search, X } from "lucide-react"

interface SearchPaletteProps<T> {
  searchUrl: (query: string) => string
  placeholder: string
  triggerLabel: string
  minChars?: number
  renderGroups: (results: T, query: string, onClose: () => void) => ReactNode
}

export default function SearchPalette<T,>({
  searchUrl,
  placeholder,
  triggerLabel,
  minChars = 2,
  renderGroups,
}: SearchPaletteProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [selectedIdx, setSelectedIdx] = useState(-1)

  // ⌘K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((p) => !p)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(t)
    }
    setSelectedIdx(-1)
  }, [open])

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < minChars) {
        setResults(null)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(searchUrl(q))
        if (res.ok) setResults(await res.json())
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    },
    [searchUrl, minChars]
  )

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 280)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function close() {
    setOpen(false)
    setQuery("")
    setResults(null)
    setSelectedIdx(-1)
  }

  function getItems() {
    if (!resultsRef.current) return []
    return Array.from(
      resultsRef.current.querySelectorAll<HTMLElement>("[data-palette-item]")
    )
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { close(); return }
    const items = getItems()
    if (!items.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = 0
      setSelectedIdx(next)
      items[next]?.focus()
    }
  }

  function handleResultsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") { close(); return }
    const items = getItems()
    if (!items.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = selectedIdx < items.length - 1 ? selectedIdx + 1 : 0
      setSelectedIdx(next)
      items[next]?.focus()
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (selectedIdx <= 0) {
        setSelectedIdx(-1)
        inputRef.current?.focus()
      } else {
        const prev = selectedIdx - 1
        setSelectedIdx(prev)
        items[prev]?.focus()
      }
    }
  }

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().includes("MAC")
  const kbd = isMac ? "⌘K" : "Ctrl K"

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-white transition-all hover:opacity-90"
        style={{ background: "#FF8F00" }}
        aria-label={`${triggerLabel} (${kbd})`}
      >
        <Search size={13} strokeWidth={2} className="shrink-0 opacity-80" />
        <span className="hidden min-w-[140px] text-left sm:block">{triggerLabel}</span>
        <kbd className="ml-auto hidden items-center rounded border border-white/20 bg-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/75 sm:flex">
          {kbd}
        </kbd>
      </button>

      {/* Backdrop + palette */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px] animate-in fade-in duration-100"
            onMouseDown={close}
          />

          <div className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-slate-900/10 animate-in zoom-in-95 fade-in duration-150">

            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              {loading ? (
                <Loader2 size={17} strokeWidth={2} className="shrink-0 animate-spin text-primary" />
              ) : (
                <Search size={17} strokeWidth={2} className="shrink-0 text-muted-foreground" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIdx(-1)
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    setResults(null)
                    inputRef.current?.focus()
                  }}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Results area */}
            <div
              ref={resultsRef}
              className="max-h-[360px] overflow-y-auto overscroll-contain"
              onKeyDown={handleResultsKeyDown}
            >
              {query.length >= minChars && results ? (
                renderGroups(results, query, close)
              ) : query.length > 0 && query.length < minChars ? (
                <PaletteEmpty text={`Escribe ${minChars - query.length} caracter${minChars - query.length !== 1 ? "es" : ""} más...`} />
              ) : (
                <PaletteEmpty text="Empieza a escribir para buscar" showIcon />
              )}
            </div>

            {/* Footer keyboard hints */}
            <div className="flex items-center gap-5 border-t border-border bg-muted/20 px-4 py-2">
              {([
                { key: "↵", label: "Abrir" },
                { key: "↑↓", label: "Navegar" },
                { key: "Esc", label: "Cerrar" },
              ] as const).map(({ key, label }) => (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[9px] text-foreground/50">
                    {key}
                  </kbd>
                  {label}
                </span>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground/60">
                {kbd} en cualquier momento
              </span>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function PaletteEmpty({ text, showIcon }: { text: string; showIcon?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {showIcon && (
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted">
          <Search size={16} strokeWidth={1.5} className="text-muted-foreground" />
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  )
}
