"use client"

import { useMemo, useState } from "react"
import { Box, FormControlLabel, Paper, Stack, Switch, Typography } from "@mui/material"

export type ActivityPoint = { day: string; value: number }
export type ActivitySeries = { name: string; color: string; data: ActivityPoint[] }

const W = 460, H = 130, PAD_X = 6, PAD_Y = 10

function buildPath(data: ActivityPoint[], max: number) {
  const w = W - PAD_X * 2
  const h = H - PAD_Y * 2
  const step = data.length > 1 ? w / (data.length - 1) : 0
  const pts = data.map((d, i) => ({
    x: PAD_X + i * step,
    y: PAD_Y + h - (d.value / max) * h,
  }))
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
}

export function LearningActivityChart({
  global,
  byCompany,
}: {
  global: ActivityPoint[]
  byCompany: ActivitySeries[]
}) {
  const [showByCompany, setShowByCompany] = useState(false)

  const series = useMemo<ActivitySeries[]>(
    () => (showByCompany ? byCompany : [{ name: "Global", color: "#3579F5", data: global }]),
    [showByCompany, byCompany, global]
  )

  const max = Math.max(...series.flatMap((s) => s.data.map((d) => d.value)), 1)

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "var(--kpi-radius, 16px)",
        backgroundColor: "var(--kpi-bg, #FFFFFF)",
        border: "1px solid var(--kpi-border, transparent)",
        boxShadow: "var(--kpi-shadow, none)",
        overflow: "hidden",
        transition: "transform 200ms",
        "&:hover": { transform: "scale(1.02)" },
      }}
    >
      <Box sx={{ px: "var(--kpi-px, 24px)", pt: "var(--kpi-pt, 24px)", pb: "var(--kpi-pb, 20px)" }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Actividad de aprendizaje · 14 días
          </Typography>
          <FormControlLabel
            sx={{ m: 0, gap: 0.5 }}
            control={
              <Switch
                size="small"
                checked={showByCompany}
                onChange={(e) => setShowByCompany(e.target.checked)}
                sx={{
                  "& .MuiSwitch-track": { backgroundColor: "rgba(22,27,35,0.18)", opacity: 1 },
                  "& .MuiSwitch-thumb": { backgroundColor: "#FFFFFF", boxShadow: "0 1px 2px rgba(22,27,35,0.35)" },
                  "& .Mui-checked+.MuiSwitch-track": { backgroundColor: "#3579F5 !important", opacity: 1 },
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))" }}>
                Por empresa
              </Typography>
            }
          />
        </Stack>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ display: "block", width: "100%", height: H, marginTop: 28 }}>
          {series.map((s) => (
            <path
              key={s.name}
              d={buildPath(s.data, max)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="line-draw-in"
            />
          ))}
        </svg>

        {showByCompany && (
          <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 0.75 }}>
            {byCompany.map((s) => (
              <Stack key={s.name} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: s.color }} />
                <Typography sx={{ fontSize: "0.6875rem", color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))" }}>
                  {s.name}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  )
}
