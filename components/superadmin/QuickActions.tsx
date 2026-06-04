"use client"

import Link from "next/link"
import { BarChart3, Building2, FileText, Package, Share2, Users, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ACTIONS: { label: string; description: string; href: string; Icon: LucideIcon }[] = [
  { label: "Empresas",    description: "Clientes y cupos",    href: "/superadmin/empresas",    Icon: Building2 },
  { label: "Paquetes",    description: "Planes y cursos",     href: "/superadmin/paquetes",    Icon: Package },
  { label: "Reportes",    description: "Analíticas globales", href: "/superadmin/reportes",    Icon: BarChart3 },
  { label: "Editor DC-3", description: "Metadatos STPS",     href: "/superadmin/dc3",         Icon: FileText },
  { label: "Accesos",     description: "Usuarios del portal", href: "/superadmin/accesos",     Icon: Users },
  { label: "Bridge WP",   description: "Estado del bridge",  href: "/superadmin/integracion", Icon: Share2 },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="text-[14px] font-medium">Accesos directos</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ label, description, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-2.5 rounded-md border border-border bg-muted/50 p-3 transition-colors hover:bg-accent hover:border-accent"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                <Icon size={14} strokeWidth={2} className="text-primary" />
              </span>
              <div>
                <p className="text-[12px] font-semibold leading-tight text-foreground">{label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
