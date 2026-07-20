"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { Award, BookOpen } from "lucide-react"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Typography from "@mui/material/Typography"

import SearchPalette from "./SearchPalette"

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
            <Box sx={{ px: 2, py: 5, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Sin resultados para{" "}
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                  &ldquo;{query}&rdquo;
                </Box>
              </Typography>
            </Box>
          )
        }

        return (
          <Box sx={{ py: 1 }}>
            {results.cursos.length > 0 && (
              <Box component="section">
                <GroupHeader icon={BookOpen} label="Mis cursos" count={results.cursos.length} />
                {results.cursos.map((c) => (
                  <ResultRow key={c.id} href="/empleado/cursos" onClose={onClose}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          bgcolor: "rgba(53,121,245,0.1)",
                          flexShrink: 0,
                        }}
                      >
                        <BookOpen size={11} strokeWidth={2} style={{ color: "#3579F5" }} />
                      </Avatar>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                        {c.nombre_curso}
                      </Typography>
                    </Box>
                    <ProgressChip curso={c} />
                  </ResultRow>
                ))}
              </Box>
            )}

            {results.constancias.length > 0 && (
              <Box component="section">
                <GroupHeader icon={Award} label="Constancias" count={results.constancias.length} />
                {results.constancias.map((c) => (
                  <ResultRow key={c.id} href="/empleado/constancias" onClose={onClose}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          bgcolor: "#dcfce7",
                          flexShrink: 0,
                        }}
                      >
                        <Award size={11} strokeWidth={2} style={{ color: "#15803d" }} />
                      </Avatar>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                        {c.nombre_curso}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "10px",
                        fontFamily: "monospace",
                        color: "text.disabled",
                        flexShrink: 0,
                      }}
                    >
                      {c.folio}
                    </Typography>
                  </ResultRow>
                ))}
              </Box>
            )}
          </Box>
        )
      }}
    />
  )
}

function GroupHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: ElementType
  label: string
  count: number
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.875, px: 2, pt: 1.5, pb: 0.75 }}>
      <Icon size={11} strokeWidth={2.5} style={{ color: "#858382", flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "text.secondary",
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "10px", color: "text.disabled", lineHeight: 1 }}>
        ({count})
      </Typography>
    </Box>
  )
}

function ResultRow({
  href,
  onClose,
  children,
}: {
  href: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <Box
      component={Link}
      href={href}
      data-palette-item=""
      tabIndex={0}
      onClick={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 2,
        py: 1.25,
        textDecoration: "none",
        color: "inherit",
        transition: "background-color 0.12s ease",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus": { bgcolor: "action.hover", outline: "none" },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "-2px",
        },
      }}
    >
      {children}
    </Box>
  )
}

function ProgressChip({ curso }: { curso: CursoResult }) {
  if (curso.completado) {
    return (
      <Chip
        label="Completado"
        size="small"
        sx={{
          height: 20,
          fontSize: "10px",
          fontWeight: 600,
          borderRadius: "10px",
          bgcolor: "#dcfce7",
          color: "#15803d",
          flexShrink: 0,
          "& .MuiChip-label": { px: 1 },
        }}
      />
    )
  }
  if (curso.progreso_pct > 0) {
    return (
      <Chip
        label={`${curso.progreso_pct}%`}
        size="small"
        sx={{
          height: 20,
          fontSize: "10px",
          fontWeight: 600,
          borderRadius: "10px",
          bgcolor: "#fef3c7",
          color: "#b45309",
          flexShrink: 0,
          "& .MuiChip-label": { px: 1 },
        }}
      />
    )
  }
  return (
    <Chip
      label="Sin iniciar"
      size="small"
      sx={{
        height: 20,
        fontSize: "10px",
        fontWeight: 600,
        borderRadius: "10px",
        bgcolor: "#f1f5f9",
        color: "#64748b",
        flexShrink: 0,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  )
}
