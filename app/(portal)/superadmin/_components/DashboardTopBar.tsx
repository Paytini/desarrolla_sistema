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
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[12px] font-medium capitalize text-slate-400">{fecha}</p>
        <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight" style={{ color: "#130303" }}>
          Bienvenido, <span style={{ color: "#F5853F" }}>{nombre}</span>
        </h1>
        <p className="mt-0.5 text-[13px] text-slate-400">Vista ejecutiva · Portal SuperAdmin</p>
      </div>
      <span
        className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: "rgba(245,133,63,0.08)",
          color: "#F5853F",
          border: "1px solid rgba(245,133,63,0.2)",
        }}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-[#F5853F]" />
        SuperAdmin
      </span>
    </div>
  )
}
