"use client"

import { useState, type ReactNode } from "react"
import { Maximize2, X } from "lucide-react"
import Dialog from "@mui/material/Dialog"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"

type ExpandableChartCardProps = {
  title: ReactNode
  extra?: ReactNode
  compactHeight: number
  expandedHeight: number
  renderChart: (height: number) => ReactNode
}

export function ExpandableChartCard({
  title,
  extra,
  compactHeight,
  expandedHeight,
  renderChart,
}: ExpandableChartCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <div className="flex items-center gap-2">
          {extra}
          <Tooltip title="Expandir">
            <IconButton
              size="small"
              onClick={() => setExpanded(true)}
              aria-label="Expandir gráfica"
            >
              <Maximize2 size={16} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {renderChart(compactHeight)}

      <Dialog open={expanded} onClose={() => setExpanded(false)} maxWidth="lg" fullWidth>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <IconButton onClick={() => setExpanded(false)} aria-label="Cerrar">
            <X size={18} />
          </IconButton>
        </div>
        <div className="p-6">{renderChart(expandedHeight)}</div>
      </Dialog>
    </div>
  )
}
