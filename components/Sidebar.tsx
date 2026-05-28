"use client"

import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  ClipboardList,
  FileCheck2,
  Home,
  LogOut,
  Package,
  Plug,
  Settings,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"

// ── Nav definitions ────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean }
type Rol     = "SUPERADMIN" | "RH" | "EMPLEADO"

const navSuperAdmin: NavItem[] = [
  { label: "Inicio",            href: "/superadmin",             icon: Home,         exact: true },
  { label: "Empresas",          href: "/superadmin/empresas",    icon: Building2 },
  { label: "Paquetes",          href: "/superadmin/paquetes",    icon: Package },
  { label: "Editor DC-3",       href: "/superadmin/dc3",         icon: FileCheck2 },
  { label: "Reportes globales", href: "/superadmin/reportes",    icon: BarChart3 },
  { label: "Integración",       href: "/superadmin/integracion", icon: Plug },
  { label: "Accesos",           href: "/superadmin/accesos",     icon: ShieldCheck },
]
const navRH: NavItem[] = [
  { label: "Inicio",        href: "/empresa/inicio",       icon: Home,         exact: true },
  { label: "Empleados",     href: "/empresa/empleados",    icon: Users },
  { label: "Asignaciones",  href: "/empresa/asignaciones", icon: ClipboardList },
  { label: "Progreso",      href: "/empresa/progreso",     icon: BarChart3 },
  { label: "Constancias",   href: "/empresa/constancias",  icon: Award },
]
const navEmpleado: NavItem[] = [
  { label: "Mis cursos",      href: "/empleado/cursos",      icon: BookOpen },
  { label: "Mis constancias", href: "/empleado/constancias", icon: Award },
]

const navByRol: Record<Rol, NavItem[]> = {
  SUPERADMIN: navSuperAdmin,
  RH:         navRH,
  EMPLEADO:   navEmpleado,
}

const roleLabel: Record<Rol, string> = {
  SUPERADMIN: "SuperAdmin",
  RH:         "RH / Empresa",
  EMPLEADO:   "Empleado",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function IconLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className={`flex items-center justify-center rounded-xl px-3 py-2.5 transition-colors ${
          active ? "bg-teal-50 text-teal-700" : "text-slate-400 hover:bg-slate-50 hover:text-slate-800"
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      </Link>
      <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </div>
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
  const pathname  = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const items     = navByRol[rol]
  const initials  = getInitials(nombre)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true")
    } catch {}
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem("sidebar-collapsed", String(next)) } catch {}
      return next
    })
  }

  const homeHref =
    rol === "SUPERADMIN" ? "/superadmin"
    : rol === "RH"       ? "/empresa/inicio"
    :                      "/empleado/cursos"

  return (
    <aside
      className={`
        sticky top-0 flex h-screen shrink-0 flex-col
        border-r border-slate-200 bg-white
        transition-[width] duration-300 ease-in-out
        ${collapsed ? "w-[68px]" : "w-[240px]"}
      `}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${
          collapsed ? "justify-center px-3" : "justify-between px-5"
        }`}
      >
        {collapsed ? (
          /* Collapsed: logo doubles as expand button */
          <button
            onClick={toggle}
            aria-label="Expandir menú"
            className="flex items-center justify-center rounded-xl transition-opacity hover:opacity-75"
          >
            <Image
              src="/assets/logo_corta.png"
              alt="D360"
              width={36}
              height={36}
              className="size-9 object-contain"
            />
          </button>
        ) : (
          <>
            <Link href={homeHref} className="block">
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={150}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
            <button
              onClick={toggle}
              aria-label="Contraer menú"
              className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ──────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {items.map((item) => {
          const Icon  = item.icon
          const active =
            pathname === item.href ||
            (!item.exact && pathname.startsWith(`${item.href}/`))

          return collapsed ? (
            <IconLink key={item.href} href={item.href} icon={Icon} label={item.label} active={active} />
          ) : (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-50 text-teal-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
              <span className="truncate">{item.label}</span>
              {active && (
                <span className="ml-auto size-1.5 shrink-0 rounded-full bg-teal-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Spacer ──────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Bottom section ──────────────────────── */}
      <div className="shrink-0 border-t border-slate-100 px-2 py-2">
        {/* Perfil + Configuración — solo SUPERADMIN */}
        {rol === "SUPERADMIN" && (
          <div className={`mb-1 ${collapsed ? "flex flex-col gap-0.5" : "grid grid-cols-2 gap-1"}`}>
            {collapsed ? (
              <>
                <IconLink
                  href="/superadmin/perfil"
                  icon={User}
                  label="Perfil"
                  active={pathname === "/superadmin/perfil"}
                />
                <IconLink
                  href="/superadmin/configuracion"
                  icon={Settings}
                  label="Configuración"
                  active={pathname === "/superadmin/configuracion"}
                />
              </>
            ) : (
              <>
                <Link
                  href="/superadmin/perfil"
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition ${
                    pathname === "/superadmin/perfil"
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <User size={12} strokeWidth={2} />
                  Perfil
                </Link>
                <Link
                  href="/superadmin/configuracion"
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition ${
                    pathname === "/superadmin/configuracion"
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Settings size={12} strokeWidth={2} />
                  Config.
                </Link>
              </>
            )}
          </div>
        )}

        {/* Logout */}
        {collapsed ? (
          <div className="group relative">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} strokeWidth={1.8} />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              Cerrar sesión
            </span>
          </div>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
          >
            <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        )}

        {/* User identity */}
        <div className={`mt-2 border-t border-slate-100 pt-3 ${collapsed ? "flex justify-center" : "px-1"}`}>
          {collapsed ? (
            <div className="group relative">
              <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-[11px] font-bold text-white">
                {initials}
              </div>
              <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {nombre}
                <span className="block text-[10px] font-normal text-slate-300">{roleLabel[rol]}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-[11px] font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{nombre}</p>
                <p className="text-[10px] text-slate-400">{roleLabel[rol]}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
