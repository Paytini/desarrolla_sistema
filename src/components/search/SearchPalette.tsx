"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Loader2, Search, X } from "lucide-react"

import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Fade from "@mui/material/Fade"
import IconButton from "@mui/material/IconButton"
import InputBase from "@mui/material/InputBase"
import Modal from "@mui/material/Modal"
import Typography from "@mui/material/Typography"
import { fd, gray } from "@/lib/theme-tokens"

interface SearchPaletteProps<T> {
  searchUrl: (query: string) => string
  placeholder: string
  triggerLabel: string
  minChars?: number
  triggerWidth?: number | string
  dark?: boolean
  renderGroups: (results: T, query: string, onClose: () => void) => ReactNode
}

export default function SearchPalette<T>({
  searchUrl,
  placeholder,
  triggerLabel,
  minChars = 2,
  triggerWidth,
  dark = false,
  renderGroups,
}: SearchPaletteProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC")
  const kbd = isMac ? "⌘K" : "Ctrl K"

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults(null)
    setSelectedIdx(-1)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (open) close()
        else setOpen(true)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
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
      } finally {
        setLoading(false)
      }
    },
    [searchUrl, minChars],
  )

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 280)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function getItems() {
    if (!resultsRef.current) return []
    return Array.from(resultsRef.current.querySelectorAll<HTMLElement>("[data-palette-item]"))
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      close()
      return
    }
    const items = getItems()
    if (!items.length) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIdx(0)
      items[0]?.focus()
    }
  }

  function handleResultsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      close()
      return
    }
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

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${triggerLabel} (${kbd})`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          height: 46,
          width: { xs: 46, sm: triggerWidth ?? 380 },
          px: { xs: 1, sm: 2.25 },
          border: "1px solid",
          borderColor: dark ? "var(--sidebar-navy-border)" : "divider",
          borderRadius: "999px",
          bgcolor: dark ? "rgba(255,255,255,0.06)" : fd.background,
          cursor: "pointer",
          fontSize: "0.875rem",
          color: dark ? "var(--sidebar-navy-text)" : "text.secondary",
          fontFamily: "inherit",
          transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
          "&:hover": dark
            ? { bgcolor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.24)" }
            : { borderColor: "primary.main", boxShadow: "0 0 0 3px rgba(59,130,246,0.08)" },
        }}
      >
        <Search size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
        <Box
          component="span"
          sx={{
            display: { xs: "none", sm: "block" },
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {triggerLabel}
        </Box>
        <Box
          component="kbd"
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            border: "1px solid",
            borderColor: dark ? "rgba(255,255,255,0.16)" : "divider",
            borderRadius: "6px",
            px: 0.875,
            py: 0.25,
            fontFamily: "monospace",
            fontSize: "10px",
            color: dark ? "rgba(255,255,255,0.6)" : "text.secondary",
            bgcolor: dark ? "rgba(255,255,255,0.08)" : "background.paper",
            flexShrink: 0,
          }}
        >
          {kbd}
        </Box>
      </Box>

      <Modal
        open={open}
        onClose={close}
        slotProps={{
          backdrop: {
            sx: {
              bgcolor: "rgba(15,23,42,0.18)",
              backdropFilter: "blur(2px)",
            },
          },
        }}
      >
        <Fade in={open}>
          <Box
            sx={{
              position: "fixed",
              top: "15vh",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100vw - 2rem)",
              maxWidth: 560,
              bgcolor: "background.paper",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
              overflow: "hidden",
              outline: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              {loading ? (
                <Loader2
                  size={17}
                  strokeWidth={2}
                  style={{
                    flexShrink: 0,
                    color: fd.primary,
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                <Search size={17} strokeWidth={2} style={{ flexShrink: 0, color: gray[400] }} />
              )}

              <InputBase
                inputRef={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIdx(-1)
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                inputProps={{ spellCheck: false, "aria-label": placeholder }}
                sx={{
                  flex: 1,
                  fontSize: "0.9375rem",
                  "& input": {
                    p: 0,
                    color: "text.primary",
                    "&::placeholder": { color: "text.secondary", opacity: 1 },
                  },
                }}
              />

              {query.length > 0 && (
                <IconButton
                  size="small"
                  aria-label="Limpiar búsqueda"
                  onClick={() => {
                    setQuery("")
                    setResults(null)
                    inputRef.current?.focus()
                  }}
                  sx={{
                    width: 24,
                    height: 24,
                    color: "text.secondary",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  <X size={13} />
                </IconButton>
              )}
            </Box>

            <Box
              ref={resultsRef}
              sx={{ maxHeight: 360, overflowY: "auto", overscrollBehavior: "contain" }}
              onKeyDown={handleResultsKeyDown}
            >
              {query.length >= minChars && results ? (
                renderGroups(results, query, close)
              ) : query.length > 0 && query.length < minChars ? (
                <PaletteEmpty
                  text={`Escribe ${minChars - query.length} caracter${
                    minChars - query.length !== 1 ? "es" : ""
                  } más...`}
                />
              ) : (
                <PaletteEmpty text="Empieza a escribir para buscar" showIcon />
              )}
            </Box>

            <Divider />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2.5,
                px: 2,
                py: 1,
                bgcolor: "rgba(0,0,0,0.015)",
              }}
            >
              {(
                [
                  { key: "↵", label: "Abrir" },
                  { key: "↑↓", label: "Navegar" },
                  { key: "Esc", label: "Cerrar" },
                ] as const
              ).map(({ key, label }) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    component="kbd"
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "6px",
                      px: 0.75,
                      py: 0.25,
                      fontFamily: "monospace",
                      fontSize: "9px",
                      color: "text.secondary",
                      bgcolor: "background.paper",
                    }}
                  >
                    {key}
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px" }}>
                    {label}
                  </Typography>
                </Box>
              ))}
              <Typography
                variant="caption"
                sx={{ ml: "auto", color: "text.disabled", fontSize: "11px" }}
              >
                {kbd} en cualquier momento
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  )
}

function PaletteEmpty({ text, showIcon }: { text: string; showIcon?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 7,
        textAlign: "center",
      }}
    >
      {showIcon && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "8px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            color: "text.secondary",
          }}
        >
          <Search size={16} strokeWidth={1.5} />
        </Box>
      )}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {text}
      </Typography>
    </Box>
  )
}
