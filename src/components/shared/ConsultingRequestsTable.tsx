import type { ReactNode } from "react"

type ConsultingRequestsTableColumn = {
  label: ReactNode
  className?: string
}

type ConsultingRequestsTableProps = {
  columns: ConsultingRequestsTableColumn[]
  rows: ReactNode[]
}

export function ConsultingRequestsTable({ columns, rows }: ConsultingRequestsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#f0f0f0] text-left text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
            {columns.map((column, index) => (
              <th key={index} className={`px-3 py-2 font-semibold ${column.className ?? ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}
