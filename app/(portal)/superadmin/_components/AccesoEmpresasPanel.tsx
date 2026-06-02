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

const QUICK_LINKS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: "Empresas",   href: "/superadmin/empresas",    Icon: Building2 },
  { label: "Paquetes",   href: "/superadmin/paquetes",    Icon: Package },
  { label: "Reportes",   href: "/superadmin/reportes",    Icon: BarChart3 },
  { label: "Integración",href: "/superadmin/integracion", Icon: Plug },
  { label: "Accesos",    href: "/superadmin/accesos",     Icon: ShieldCheck },
  { label: "DC-3",       href: "/superadmin/dc3",         Icon: FileCheck },
]

interface AccesoEmpresasPanelProps {
  empresas: Array<{ id: number; nombre: string; activo: boolean }>
}

export function AccesoEmpresasPanel({ empresas }: AccesoEmpresasPanelProps) {
  const recent = empresas.slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Quick links */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Acceso rápido
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_LINKS.map(({ label, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-1.5 rounded-xl py-3 text-center transition"
              style={{ background: "rgba(0,0,34,0.03)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,133,63,0.06)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,34,0.03)"}
            >
              <Icon size={15} strokeWidth={2} className="text-slate-400 group-hover:text-[#F5853F] transition-colors" />
              <span className="text-[10px] font-semibold text-slate-500 group-hover:text-[#130303] transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Recent companies */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Empresas recientes
          </p>
          <Link href="/superadmin/empresas" className="text-[11px] font-semibold" style={{ color: "#F5853F" }}>
            Ver todas →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-[12px] text-slate-400">Aún no hay empresas registradas.</p>
        ) : (
          <div className="space-y-0">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between border-b border-slate-50 py-2.5"
              >
                <p className="text-[13px] font-medium" style={{ color: "#130303" }}>{e.nombre}</p>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: e.activo ? "#16a34a" : "#94a3b8" }}
                >
                  {e.activo ? "Activa" : "Suspendida"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
