"use client"

import { useState } from "react"
import Link from "next/link"
import { Box, Chip, Divider, Stack, Typography } from "@mui/material"
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { SectionCard } from "@/components/shared/SectionCard"

type Renewal = {
  empresa: {
    id: number
    nombre: string
    paquetes: Array<{
      paquete: { nombre: string }
      fecha_vencimiento: Date | null
    }>
  }
  days: number
}

function DayChip({ days }: { days: number }) {
  if (days < 0) {
    return (
      <Chip
        label="Vencido"
        size="small"
        sx={{ height: 20, borderRadius: "4px", fontSize: 10, fontWeight: 600, bgcolor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
      />
    )
  }
  if (days <= 7) {
    return (
      <Chip
        label={`${days}d`}
        size="small"
        sx={{ height: 20, borderRadius: "4px", fontSize: 10, fontWeight: 600, bgcolor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}
      />
    )
  }
  return (
    <Chip
      label={`${days}d`}
      size="small"
      sx={{ height: 20, borderRadius: "4px", fontSize: 10, fontWeight: 600, bgcolor: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
    />
  )
}

export function RenovacionesTable({ renewals }: { renewals: Renewal[] }) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const sorted = [...renewals]
    .sort((a, b) => sortDir === "asc" ? a.days - b.days : b.days - a.days)
    .slice(0, 6)

  return (
    <SectionCard
      title="Renovaciones"
      description="Paquetes por vencer en 30 días"
      disableContentPadding
      action={
        renewals.length > 6 ? (
          <Typography
            component={Link}
            href="/superadmin/reports"
            sx={{ fontSize: 11, fontWeight: 600, color: "primary.main", textDecoration: "none", "&:hover": { opacity: 0.75 } }}
          >
            Ver todos →
          </Typography>
        ) : undefined
      }
    >
      {renewals.length === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: "center", py: 5, textAlign: "center" }}>
          <CheckCircle2 size={20} style={{ color: "#cbd5e1" }} />
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Sin alertas de vencimiento
          </Typography>
        </Stack>
      ) : (
        <Box>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f8fafc", px: 2.5, py: 1 }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.disabled" }}>
              Empresa
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.25,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "text.disabled",
                bgcolor: "transparent",
                border: "none",
                cursor: "pointer",
                p: 0,
                "&:hover": { color: "text.secondary" },
              }}
            >
              Días {sortDir === "asc" ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </Box>
          </Stack>
          <Stack divider={<Divider sx={{ borderColor: "#f8fafc" }} />}>
            {sorted.map(({ empresa, days }) => (
              <Stack
                key={empresa.id}
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", px: 2.5, py: 1.5, "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box sx={{ minWidth: 0, flex: 1, pr: 1.5 }}>
                  <Typography
                    sx={{ fontSize: 13, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {empresa.nombre}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11, color: "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {empresa.paquetes[0]?.paquete.nombre ?? "Sin paquete"}
                  </Typography>
                </Box>
                <DayChip days={days} />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </SectionCard>
  )
}
