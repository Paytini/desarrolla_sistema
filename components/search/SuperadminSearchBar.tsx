"use client"

import type { ElementType } from "react"
import Link from "next/link"
import { Building2, Package, Users } from "lucide-react"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Typography from "@mui/material/Typography"

import SearchPalette from "./SearchPalette"

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
      triggerWidth="100%"
      renderGroups={(results, query, onClose) => {
        const hasResults =
          results.empresas.length > 0 ||
          results.empleados.length > 0 ||
          results.paquetes.length > 0

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
            {results.empresas.length > 0 && (
              <Box component="section">
                <GroupHeader icon={Building2} label="Empresas" count={results.empresas.length} />
                {results.empresas.map((e) => (
                  <ResultRow
                    key={e.id}
                    href={`/superadmin/empresas/${e.id}`}
                    onClose={onClose}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <LetterAvatar letter={e.nombre[0]} variant="blue" />
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                        {e.nombre}
                      </Typography>
                    </Box>
                    <StatusChip active={e.activo} activeLabel="Activa" inactiveLabel="Suspendida" />
                  </ResultRow>
                ))}
              </Box>
            )}

            {results.empleados.length > 0 && (
              <Box component="section">
                <GroupHeader icon={Users} label="Empleados" count={results.empleados.length} />
                {results.empleados.map((e) => (
                  <ResultRow
                    key={e.id}
                    href="/superadmin/accesos"
                    onClose={onClose}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <LetterAvatar letter={e.nombre[0]} variant="slate" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                          {e.nombre} {e.apellido}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.email} · {e.empresa.nombre}
                        </Typography>
                      </Box>
                    </Box>
                  </ResultRow>
                ))}
              </Box>
            )}

            {results.paquetes.length > 0 && (
              <Box component="section">
                <GroupHeader icon={Package} label="Paquetes" count={results.paquetes.length} />
                {results.paquetes.map((p) => (
                  <ResultRow
                    key={p.id}
                    href="/superadmin/paquetes"
                    onClose={onClose}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <LetterAvatar letter={p.nombre[0]} variant="slate" />
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "text.primary" }}>
                        {p.nombre}
                      </Typography>
                    </Box>
                    <StatusChip active={p.activo} activeLabel="Activo" inactiveLabel="Inactivo" />
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

function LetterAvatar({ letter, variant }: { letter: string; variant: "blue" | "slate" }) {
  const colors = {
    blue:  { bgcolor: "rgba(53,121,245,0.1)", color: "#3579F5" },
    slate: { bgcolor: "#f1f5f9",              color: "#64748b" },
  }[variant]

  return (
    <Avatar
      variant="rounded"
      sx={{
        width: 24,
        height: 24,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: "6px",
        flexShrink: 0,
        ...colors,
      }}
    >
      {letter.toUpperCase()}
    </Avatar>
  )
}

function StatusChip({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean
  activeLabel: string
  inactiveLabel: string
}) {
  return (
    <Chip
      label={active ? activeLabel : inactiveLabel}
      size="small"
      sx={{
        height: 20,
        fontSize: "10px",
        fontWeight: 600,
        borderRadius: "10px",
        bgcolor: active ? "#dcfce7" : "#f1f5f9",
        color: active ? "#15803d" : "#64748b",
        flexShrink: 0,
        "& .MuiChip-label": { px: 1 },
      }}
    />
  )
}
