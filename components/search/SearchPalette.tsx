"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Loader2, Search, X } from "lucide-react"

import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Fade from "@mui/material/Fade"
import IconButton from "@mui/material/IconButton"
import InputBase from "@mui/material/InputBase"
import Modal from "@mui/material/Modal"
import Typography from "@mui/material/Typography"

interface SearchPaletteProps<T> {
  searchUrl:     (query: string) => string
  placeholder:   string
  triggerLabel:  string
  minChars?:     number
  renderGroups:  (results: T, query: string, onClose: () => void) => ReactNode
}

export default function SearchPalette<T,>({
  searchUrl,
  placeholder,
  triggerLabel,
  minChars = 2,
  renderGroups,
}: SearchPaletteProps<T>) {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState("")
  const [results, setResults]     = useState<T | null>(null)
  const [loading, setLoading]     = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef   = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().includes("MAC")
  const kbd = isMac ? "⌘K" : "Ctrl K"

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

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
    setSelectedIdx(-1)
  }, [open])

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < minChars) { setResults(null); return }
      setLoading(true)
      try {
        const res = await fetch(searchUrl(q))
        if (res.ok) setResults(await res.json())
      } catch {
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
      setSelectedIdx(0)
      items[0]?.focus()
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
          gap: 1.25,
          height: 40,
          width: { xs: 40, sm: 280 },
          px: { xs: 1, sm: 2 },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
          bgcolor: "background.default",
          cursor: "pointer",
          fontSize: "0.8125rem",
          color: "text.secondary",
          fontFamily: "inherit",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "0 0 0 3px rgba(245,133,63,0.08)",
          },
        }}
      >
        <Search size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
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
            borderColor: "divider",
            borderRadius: "10px",
            px: 0.875,
            py: 0.25,
            fontFamily: "monospace",
            fontSize: "10px",
            color: "text.secondary",
            bgcolor: "background.paper",
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
              boxShadow: "0 25px 60px rgba(0,0,34,0.15), 0 8px 24px rgba(0,0,34,0.08)",
              overflow: "hidden",
              outline: "none",
            }}
          >
            <Box
              sx={{
                height: 3,
                background:
                  "linear-gradient(to right, #F5853F, #2DD4BF, #A78BFA)",
              }}
            />

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
                  style={{ flexShrink: 0, color: "#F5853F", animation: "spin 0.8s linear infinite" }}
                />
              ) : (
                <Search size={17} strokeWidth={2} style={{ flexShrink: 0, color: "#858382" }} />
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
                inputProps={{ spellCheck: false }}
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
              {([
                { key: "↵", label: "Abrir" },
                { key: "↑↓", label: "Navegar" },
                { key: "Esc", label: "Cerrar" },
              ] as const).map(({ key, label }) => (
                <Box
                  key={key}
                  sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                >
                  <Box
                    component="kbd"
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "5px",
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
            borderRadius: "12px",
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
