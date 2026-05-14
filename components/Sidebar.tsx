"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

type IconName =
  | "home"
  | "building"
  | "package"
  | "chart"
  | "plug"
  | "shield"
  | "users"
  | "clipboard"
  | "certificate"
  | "book"

type NavItem = {
  label: string
  href: string
  icon: IconName
}

const navSuperAdmin: NavItem[] = [
  { label: "Empresas", href: "/superadmin/empresas", icon: "building" },
  { label: "Paquetes", href: "/superadmin/paquetes", icon: "package" },
  { label: "Reportes globales", href: "/superadmin/reportes", icon: "chart" },
  { label: "Integración", href: "/superadmin/integracion", icon: "plug" },
  { label: "Accesos", href: "/superadmin/accesos", icon: "shield" },
]

const navRH: NavItem[] = [
  { label: "Inicio", href: "/empresa/inicio", icon: "home" },
  { label: "Empleados", href: "/empresa/empleados", icon: "users" },
  { label: "Asignaciones", href: "/empresa/asignaciones", icon: "clipboard" },
  { label: "Progreso", href: "/empresa/progreso", icon: "chart" },
  { label: "Constancias", href: "/empresa/constancias", icon: "certificate" },
]

const navEmpleado: NavItem[] = [
  { label: "Mis cursos", href: "/empleado/cursos", icon: "book" },
  { label: "Mis constancias", href: "/empleado/constancias", icon: "certificate" },
]

type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"

const navByRol: Record<Rol, NavItem[]> = {
  SUPERADMIN: navSuperAdmin,
  RH: navRH,
  EMPLEADO: navEmpleado,
}

const badgeByRol: Record<Rol, { label: string; className: string }> = {
  SUPERADMIN: { label: "SuperAdmin", className: "bg-teal-400/10 text-teal-200 ring-teal-300/20" },
  RH: { label: "RH / Empresa", className: "bg-violet-400/10 text-violet-200 ring-violet-300/20" },
  EMPLEADO: { label: "Empleado", className: "bg-amber-400/10 text-amber-200 ring-amber-300/20" },
}

const iconPaths: Record<IconName, string[]> = {
  home: [
    "M3 11.5 12 4l9 7.5",
    "M5 10.5V20h5v-5h4v5h5v-9.5",
  ],
  building: [
    "M4 20h16",
    "M6 20V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V20",
    "M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2",
  ],
  package: [
    "M4 8.5 12 4l8 4.5-8 4.5L4 8.5Z",
    "M4 8.5V16l8 4 8-4V8.5",
    "M12 13v7",
  ],
  chart: [
    "M4 19V5",
    "M4 19h16",
    "M8 16v-5",
    "M12 16V8",
    "M16 16v-9",
  ],
  plug: [
    "M9 7V3",
    "M15 7V3",
    "M7 7h10v4a5 5 0 0 1-10 0V7Z",
    "M12 16v5",
  ],
  shield: [
    "M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z",
    "M9 12l2 2 4-5",
  ],
  users: [
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M3 21a6 6 0 0 1 12 0",
    "M17 11a3 3 0 1 0 0-6",
    "M16 15a5 5 0 0 1 5 5",
  ],
  clipboard: [
    "M9 4h6l1 2h3v15H5V6h3l1-2Z",
    "M9 11h6",
    "M9 15h6",
  ],
  certificate: [
    "M5 4h14v11H5V4Z",
    "M8 8h8",
    "M8 12h5",
    "M10 15l-1 6 3-2 3 2-1-6",
  ],
  book: [
    "M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z",
    "M5 5.5V21",
    "M9 7h7",
  ],
}

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    >
      {iconPaths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

export default function Sidebar({
  rol,
  nombre,
  empresa,
}: {
  rol: Rol
  nombre: string
  empresa?: string
}) {
  const pathname = usePathname()
  const items = navByRol[rol]
  const badge = badgeByRol[rol]

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 overflow-hidden border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="px-6 pb-6 pt-7">
          <Link href="/" className="grid gap-2 rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <span className="flex h-16 items-center justify-center rounded-2xl bg-white px-4 shadow-lg shadow-orange-950/20">
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="DesarrollaMX 360"
                width={220}
                height={80}
                className="h-14 w-full object-contain"
                priority
              />
            </span>
            <span className="text-center text-xs font-medium text-slate-400">Portal empresarial</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <NavIcon name={item.icon} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-5">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badge.className}`}>
            {badge.label}
          </span>

          <div className="mt-4 rounded-2xl bg-white/[0.06] p-4">
            <p className="truncate text-sm font-semibold text-white">{nombre}</p>
            {empresa ? <p className="mt-1 truncate text-xs text-slate-400">{empresa}</p> : null}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.9"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M14 4h5v16h-5" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
