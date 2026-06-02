import { Badge } from "@/components/ui/badge"

interface DashboardTopBarProps {
  nombre: string
}

export function DashboardTopBar({ nombre }: DashboardTopBarProps) {
  const fecha = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm capitalize text-slate-400">{fecha}</p>
        <h1 className="text-2xl font-bold text-slate-950">
          Bienvenido, {nombre}
        </h1>
      </div>
      <Badge className="gap-1.5 bg-[#F5853F] px-3 py-1 text-white hover:bg-[#D96B20]">
        <span className="size-1.5 animate-pulse rounded-full bg-white" />
        SUPERADMIN
      </Badge>
    </div>
  )
}
