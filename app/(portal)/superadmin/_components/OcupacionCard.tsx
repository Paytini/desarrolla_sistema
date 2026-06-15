import { Box, LinearProgress, Stack, Typography } from "@mui/material"
import { SectionCard } from "@/components/mui/SectionCard"

interface OcupacionCardProps {
  ocupacionPct: number
  empresas: Array<{ id: number; nombre: string; asientos_usados: number; asientos_contratados: number }>
}

function HorizontalBar({ nombre, usados, contratados }: { nombre: string; usados: number; contratados: number }) {
  const pct = contratados ? Math.round((usados / contratados) * 100) : 0
  const barColor =
    pct >= 90 ? "#dc2626" :
    pct >= 70 ? "#d97706" :
    "#1a4f8a"

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 0.75 }}>
        <Typography
          sx={{
            minWidth: 0,
            flex: 1,
            fontSize: 12,
            color: "text.secondary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {nombre}
        </Typography>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "text.disabled" }}>
            {usados}/{contratados}
          </Typography>
          <Typography sx={{ minWidth: 32, textAlign: "right", fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: barColor }}>
            {pct}%
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{
          height: 6,
          borderRadius: 999,
          bgcolor: "#f1f5f9",
          "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: barColor },
        }}
      />
    </Box>
  )
}

export function OcupacionCard({ ocupacionPct, empresas }: OcupacionCardProps) {
  return (
    <SectionCard
      title="Ocupación de cupos"
      description="Cupos usados vs. contratados"
      action={
        <Box sx={{ textAlign: "right" }}>
          <Typography
            variant="h3"
            sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: ocupacionPct >= 90 ? "error.main" : "text.primary" }}
          >
            {ocupacionPct}%
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
            ocupación global
          </Typography>
        </Box>
      }
    >
      {empresas.length === 0 ? (
        <Typography sx={{ textAlign: "center", fontSize: 13, color: "text.secondary" }}>
          Sin empresas registradas.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {empresas.slice(0, 6).map((e) => (
            <HorizontalBar key={e.id} nombre={e.nombre} usados={e.asientos_usados} contratados={e.asientos_contratados} />
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}
