// app/(portal)/superadmin/_components/DashboardTopBar.tsx

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
    <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-7">
      <div>
        <p
          className="text-[11px] font-semibold capitalize tracking-widest"
          style={{ color: "#F5853F" }}
        >
          {fecha}
        </p>
        <h1
          className="mt-2 text-[36px] font-bold leading-tight tracking-tight"
          style={{ color: "#130303" }}
        >
          Bienvenido, {nombre}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Vista ejecutiva · Portal SuperAdmin
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{
            background: "rgba(245,133,63,0.08)",
            color: "#F5853F",
            border: "1px solid rgba(245,133,63,0.2)",
          }}
        >
          <span className="size-1.5 animate-pulse rounded-full bg-[#F5853F]" />
          SUPERADMIN
        </div>
      </div>
    </div>
  )
}
