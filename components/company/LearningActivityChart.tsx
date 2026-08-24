"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type LearningActivityPoint = {
  label: string
  completions: number
}

type LearningActivityChartProps = {
  data: LearningActivityPoint[]
  changeVsPreviousWeek: number | null
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
      <p className="text-sm font-semibold text-[#1a1a1a]">{label}</p>
      <p className="text-sm text-portal-blue">
        finalizaciones: <span className="font-semibold">{payload[0].value}</span>
      </p>
    </div>
  )
}

export function LearningActivityChart({ data, changeVsPreviousWeek }: LearningActivityChartProps) {
  return (
    <div className="rounded-lg bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Actividad semanal
          </p>
          <h2 className="text-base font-semibold text-slate-950">
            Finalizaciones de cursos por día
          </h2>
        </div>
        {changeVsPreviousWeek !== null ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              changeVsPreviousWeek >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {changeVsPreviousWeek >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {changeVsPreviousWeek >= 0 ? "+" : ""}
            {changeVsPreviousWeek}% vs semana previa
          </span>
        ) : null}
      </div>

      <div className="h-56 w-full">
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
              tick={{ fontSize: 12, fill: "#94a3b8" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              allowDecimals={false}
              width={28}
            />
            <Tooltip content={<ActivityTooltip />} cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="completions"
              stroke="var(--portal-blue)"
              strokeWidth={2}
              fill="url(#learningActivityFill)"
              dot={{ r: 3, fill: "var(--portal-blue)", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "var(--portal-blue)", strokeWidth: 2, stroke: "#FFFFFF" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
