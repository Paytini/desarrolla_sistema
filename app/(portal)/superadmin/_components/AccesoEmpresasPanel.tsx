// app/(portal)/superadmin/_components/AccesoEmpresasPanel.tsx
import Link from "next/link"
import {
  BarChart3,
  Building2,
  FileCheck,
  Package,
  Plug,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const QUICK_LINKS: {
  label: string
  href: string
  Icon: LucideIcon
  iconCls: string
}[] = [
  {
    label: "Empresas",
    href: "/superadmin/empresas",
    Icon: Building2,
    iconCls: "bg-[#fff2eb] text-[#F5853F]",
  },
  {
    label: "Paquetes",
    href: "/superadmin/paquetes",
    Icon: Package,
    iconCls: "bg-violet-50 text-violet-600",
  },
  {
    label: "Reportes",
    href: "/superadmin/reportes",
    Icon: BarChart3,
    iconCls: "bg-amber-50 text-amber-600",
  },
  {
    label: "Integración",
    href: "/superadmin/integracion",
    Icon: Plug,
    iconCls: "bg-[#fff2eb] text-[#F5853F]",
  },
  {
    label: "Accesos",
    href: "/superadmin/accesos",
    Icon: ShieldCheck,
    iconCls: "bg-slate-100 text-slate-500",
  },
  {
    label: "DC-3",
    href: "/superadmin/dc3",
    Icon: FileCheck,
    iconCls: "bg-teal-50 text-teal-600",
  },
]

interface AccesoEmpresasPanelProps {
  empresas: Array<{ id: number; nombre: string; activo: boolean }>
}

export function AccesoEmpresasPanel({ empresas }: AccesoEmpresasPanelProps) {
  const recent = empresas.slice(0, 4)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px]">Acceso rápido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick-links grid */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map(({ label, href, Icon, iconCls }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg p-2.5 transition hover:bg-[#fff2eb]"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${iconCls}`}
              >
                <Icon size={13} strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>

        <Separator />

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Empresas recientes
        </p>

        {recent.length === 0 ? (
          <p className="text-center text-xs text-slate-400">
            Aún no hay empresas registradas.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nombre}</TableCell>
                    <TableCell>
                      {e.activo ? (
                        <Badge className="bg-green-50 text-green-700 hover:bg-green-50">
                          Activa
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">
                          Suspendida
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right">
              <Link
                href="/superadmin/empresas"
                className="text-xs font-semibold text-[#F5853F] transition hover:text-[#D96B20]"
              >
                Ver todas →
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
