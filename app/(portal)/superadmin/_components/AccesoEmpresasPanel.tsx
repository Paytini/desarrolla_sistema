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
  { label: "Empresas",    href: "/superadmin/empresas",    Icon: Building2 },
  { label: "Paquetes",    href: "/superadmin/paquetes",    Icon: Package },
  { label: "Reportes",    href: "/superadmin/reportes",    Icon: BarChart3 },
  { label: "Integración", href: "/superadmin/integracion", Icon: Plug },
  { label: "Accesos",     href: "/superadmin/accesos",     Icon: ShieldCheck },
  { label: "DC-3",        href: "/superadmin/dc3",         Icon: FileCheck },
]

interface AccesoEmpresasPanelProps {
  empresas: Array<{ id: number; nombre: string; activo: boolean }>
}

export function AccesoEmpresasPanel({ empresas }: AccesoEmpresasPanelProps) {
  const recent = empresas.slice(0, 4)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Quick links */}
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[13px] font-semibold" style={{ color: "#130303" }}>Acceso rápido</p>
        <p className="text-[12px] text-slate-400">Secciones principales del portal</p>
      </div>
      <div className="grid grid-cols-3 gap-px bg-slate-100 border-b border-slate-100">
        {QUICK_LINKS.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-1.5 bg-white px-2 py-4 text-center transition hover:bg-[#fff8f5]"
          >
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-slate-50 transition group-hover:bg-[#fff2eb]"
            >
              <Icon size={14} strokeWidth={2} className="text-slate-400 group-hover:text-[#F5853F] transition-colors" />
            </span>
            <span className="text-[10px] font-semibold text-slate-500 group-hover:text-[#130303] transition-colors leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* Recent companies */}
      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-slate-400">Empresas recientes</p>
          <Link href="/superadmin/empresas" className="text-[11px] font-semibold" style={{ color: "#F5853F" }}>
            Ver todas →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-center text-[12px] text-slate-400 py-4">Sin empresas registradas.</p>
        ) : (
          <div className="space-y-0">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
              >
                <p className="text-[13px] font-medium" style={{ color: "#130303" }}>{e.nombre}</p>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: e.activo ? "#16a34a" : "#94a3b8" }}
                >
                  {e.activo ? "● Activa" : "○ Suspendida"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
