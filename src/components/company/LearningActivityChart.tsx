"use client"

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

export type LearningActivityPoint = {
  label: string
  completions: number
}

type LearningActivityChartProps = {
  data: LearningActivityPoint[]
  height?: number
}

type ActivityTooltipProps = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function ActivityTooltip({ active, payload, label }: ActivityTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-portal-border bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-portal-ink">{label}</p>
      <p className="text-sm text-portal-blue">
        finalizaciones: <span className="font-semibold">{payload[0].value}</span>
      </p>
    </div>
  )
}

export function LearningActivityChart({ data, height = 224 }: LearningActivityChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="learningActivityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--portal-blue)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--portal-blue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--portal-border)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: slate[400] }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: slate[400] }}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<ActivityTooltip />} cursor={{ stroke: slate[300], strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="completions"
            stroke="var(--portal-blue)"
            strokeWidth={2}
            fill="url(#learningActivityFill)"
            dot={{ r: 3, fill: "var(--portal-blue)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--portal-blue)", strokeWidth: 2, stroke: fd.background }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
