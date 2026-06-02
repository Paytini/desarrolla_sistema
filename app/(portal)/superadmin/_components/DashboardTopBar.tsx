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

  const hora = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-8 py-6"
      style={{ background: "#000022" }}
    >
      {/* Decorative circles */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-52 rounded-full"
        style={{ background: "rgba(245,133,63,0.08)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-8 right-32 size-32 rounded-full"
        style={{ background: "rgba(245,133,63,0.05)" }}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <p
            className="text-[11px] font-semibold capitalize tracking-widest"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {fecha}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight text-white">
            Bienvenido, <span style={{ color: "#F5853F" }}>{nombre}</span>
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Vista ejecutiva del portal empresarial
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
            SUPERADMIN
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{hora}</p>
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
            style={{ background: "rgba(245,133,63,0.25)", border: "1px solid rgba(245,133,63,0.4)" }}
          >
            <span className="size-1.5 animate-pulse rounded-full bg-[#F5853F]" />
            EN LÍNEA
          </div>
        </div>
      </div>
    </div>
  )
}
