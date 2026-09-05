"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { slate } from "@/lib/theme-tokens"

export type DepartmentProgressPoint = {
  department: string
  averageProgress: number
}

type DepartmentProgressChartProps = {
  data: DepartmentProgressPoint[]
  height?: number
}

type DepartmentTooltipProps = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function DepartmentTooltip({ active, payload, label }: DepartmentTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-portal-border bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-portal-ink">{label}</p>
      <p className="text-sm text-portal-blue">
        avance promedio: <span className="font-semibold">{payload[0].value}%</span>
      </p>
    </div>
  )
}

export function DepartmentProgressChart({ data, height = 256 }: DepartmentProgressChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--portal-border)" strokeDasharray="4 4" />
          <XAxis
            dataKey="department"
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
            tick={{ fontSize: 11, fill: slate[400] }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: slate[400] }}
            width={36}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<DepartmentTooltip />} cursor={{ fill: "rgba(53,121,245,0.06)" }} />
          <Bar
            dataKey="averageProgress"
            fill="var(--portal-blue)"
            radius={[6, 6, 0, 0]}
            maxBarSize={56}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
