"use client"

import { useMemo, useState } from "react"
import { Maximize2, X } from "lucide-react"
import {
  Box,
  Dialog,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { fd, slate } from "@/lib/theme-tokens"

export type ActivityPoint = { day: string; value: number }
export type ActivitySeries = { name: string; color: string; data: ActivityPoint[] }

function formatDayLabel(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return day
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

type TooltipPayloadEntry = { name: string; value: number; color: string }

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <Box
      sx={{
        borderRadius: "10px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        px: 2,
        py: 1.25,
      }}
    >
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "text.primary", mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((entry) => (
        <Typography
          key={entry.name}
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            display: "flex",
            gap: 0.75,
            alignItems: "center",
          }}
        >
          <Box
            component="span"
            sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: entry.color, flexShrink: 0 }}
          />
          {entry.name}: <strong style={{ color: "inherit" }}>{entry.value}</strong>
        </Typography>
      ))}
    </Box>
  )
}

function ActivityChartBody({
  chartData,
  series,
  showByCompany,
  height,
}: {
  chartData: Record<string, string | number>[]
  series: ActivitySeries[]
  showByCompany: boolean
  height: number
}) {
  return (
    <Box sx={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.name}
                id={`activityFill-${s.name}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--portal-border)" strokeDasharray="4 4" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: slate[400] }}
            interval={showByCompany ? 2 : 1}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: slate[400] }}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<ActivityTooltip />} cursor={{ stroke: slate[300], strokeWidth: 1 }} />
          {series.map((s) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#activityFill-${s.name})`}
              dot={series.length === 1 ? { r: 3, fill: s.color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: s.color, strokeWidth: 2, stroke: fd.background }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}

export function LearningActivityChart({
  global,
  byCompany,
}: {
  global: ActivityPoint[]
  byCompany: ActivitySeries[]
}) {
  const [showByCompany, setShowByCompany] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const series = useMemo<ActivitySeries[]>(
    () =>
      showByCompany ? byCompany : [{ name: "Global", color: "var(--portal-blue)", data: global }],
    [showByCompany, byCompany, global],
  )

  const chartData = useMemo(() => {
    const days = series[0]?.data.map((d) => d.day) ?? []
    return days.map((day, i) => {
      const row: Record<string, string | number> = { day: formatDayLabel(day) }
      for (const s of series) row[s.name] = s.data[i]?.value ?? 0
      return row
    })
  }, [series])

  const legend = showByCompany && (
    <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 0.75 }}>
      {byCompany.map((s) => (
        <Stack key={s.name} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: s.color }} />
          <Typography
            sx={{ fontSize: "0.6875rem", color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))" }}
          >
            {s.name}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )

  const byCompanyToggle = (
    <FormControlLabel
      sx={{ m: 0, gap: 0.5 }}
      control={
        <Switch
          size="small"
          checked={showByCompany}
          onChange={(e) => setShowByCompany(e.target.checked)}
          sx={{
            "& .MuiSwitch-track": { backgroundColor: "rgba(22,27,35,0.18)", opacity: 1 },
            "& .MuiSwitch-thumb": {
              backgroundColor: fd.background,
              boxShadow: "0 1px 2px rgba(22,27,35,0.35)",
            },
            "& .Mui-checked+.MuiSwitch-track": {
              backgroundColor: "var(--portal-blue) !important",
              opacity: 1,
            },
          }}
        />
      }
      label={
        <Typography
          sx={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))",
          }}
        >
          Por empresa
        </Typography>
      }
    />
  )

  return (
    <>
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
        <Box
          sx={{ px: "var(--kpi-px, 24px)", pt: "var(--kpi-pt, 24px)", pb: "var(--kpi-pb, 20px)" }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 1 }}
          >
            <Typography
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Actividad de aprendizaje · 14 días
            </Typography>
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
              {byCompanyToggle}
              <MuiTooltip title="Ver gráfica completa">
                <IconButton
                  size="small"
                  onClick={() => setExpanded(true)}
                  aria-label="Expandir gráfica"
                  sx={{ color: "var(--kpi-text-secondary, rgba(17,24,39,0.6))" }}
                >
                  <Maximize2 size={15} />
                </IconButton>
              </MuiTooltip>
            </Stack>
          </Stack>

          <ActivityChartBody
            chartData={chartData}
            series={series}
            showByCompany={showByCompany}
            height={200}
          />

          {legend}
        </Box>
      </Paper>

      <Dialog open={expanded} onClose={() => setExpanded(false)} maxWidth="lg" fullWidth>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, color: "text.primary" }}>
            Actividad de aprendizaje · 14 días
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            {byCompanyToggle}
            <IconButton onClick={() => setExpanded(false)} aria-label="Cerrar">
              <X size={18} />
            </IconButton>
          </Stack>
        </Box>
        <Box sx={{ p: 3 }}>
          <ActivityChartBody
            chartData={chartData}
            series={series}
            showByCompany={showByCompany}
            height={420}
          />
          {legend}
        </Box>
      </Dialog>
    </>
  )
}
