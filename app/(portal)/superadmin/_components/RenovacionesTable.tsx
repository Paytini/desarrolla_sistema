// app/(portal)/superadmin/_components/RenovacionesTable.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

function RenewalBadge({ days }: { days: number }) {
  if (days < 0)
    return (
      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
        Vencido
      </Badge>
    )
  if (days <= 7)
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        {days}d
      </Badge>
    )
  return (
    <Badge className="bg-[#fff2eb] text-[#D96B20] hover:bg-[#fff2eb]">
      {days}d
    </Badge>
  )
}

interface RenovacionesTableProps {
  renewals: Renewal[]
}

export function RenovacionesTable({ renewals }: RenovacionesTableProps) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const sorted = [...renewals]
    .sort((a, b) => (sortDir === "asc" ? a.days - b.days : b.days - a.days))
    .slice(0, 5)

  const SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-[15px]">Renovaciones próximas</CardTitle>
            <CardDescription>Paquetes que vencen en 30 días.</CardDescription>
          </div>
          {renewals.length > 5 && (
            <Link
              href="/superadmin/reportes"
              className="text-xs font-semibold text-[#F5853F] transition hover:text-[#D96B20]"
            >
              Ver todos →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 size={28} className="text-green-500" />
            <p className="text-sm text-slate-500">Sin alertas de vencimiento.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Paquete</TableHead>
                <TableHead>
                  <button
                    onClick={() =>
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                    }
                    className="flex items-center gap-1 hover:text-slate-950"
                  >
                    Estado
                    <SortIcon size={13} />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(({ empresa, days }) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">
                    {empresa.nombre}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {empresa.paquetes[0]?.paquete.nombre ?? "Sin paquete"}
                  </TableCell>
                  <TableCell>
                    <RenewalBadge days={days} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
