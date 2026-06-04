interface DashboardTopBarProps {
  nombre: string
}

export function DashboardTopBar({ nombre }: DashboardTopBarProps) {
  const fecha = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight text-slate-950">
          {nombre}
        </h1>
        <p className="mt-0.5 text-[13px] capitalize text-slate-400">{fecha}</p>
      </div>
      <span
        className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{
          background: "rgba(55,48,163,0.06)",
          borderColor: "rgba(55,48,163,0.18)",
          color: "#3730a3",
        }}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-[#3730a3]" />
        SuperAdmin
      </span>
    </div>
  )
}
