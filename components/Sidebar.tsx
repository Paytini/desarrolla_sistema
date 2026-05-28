"use client"

import {
  BarChart3,
  Award,
  BookOpen,
  Building2,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Share2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean }
type NavSection = { heading: string; items: NavItem[] }
type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"

const navSuperAdminSections: NavSection[] = [
  {
    heading: "Principal",
    items: [
      { label: "Dashboard",  href: "/superadmin",             icon: LayoutDashboard, exact: true },
      { label: "Empresas",   href: "/superadmin/empresas",    icon: Building2 },
    ],
  },
  {
    heading: "Operaciones",
    items: [
      { label: "Paquetes",       href: "/superadmin/paquetes",    icon: Package },
      { label: "Editor DC-3",    href: "/superadmin/dc3",         icon: FileText },
      { label: "Reportes",       href: "/superadmin/reportes",    icon: BarChart3 },
      { label: "Accesos",        href: "/superadmin/accesos",     icon: Users },
    ],
  },
  {
    heading: "Sistema",
    items: [
      { label: "Integración WP", href: "/superadmin/integracion",  icon: Share2 },
      { label: "Configuración",  href: "/superadmin/configuracion", icon: Settings },
    ],
  },
]

const navRH: NavItem[] = [
  { label: "Inicio",        href: "/empresa/inicio",       icon: LayoutDashboard, exact: true },
  { label: "Empleados",     href: "/empresa/empleados",    icon: Users },
  { label: "Asignaciones",  href: "/empresa/asignaciones", icon: ClipboardList },
  { label: "Progreso",      href: "/empresa/progreso",     icon: BarChart3 },
  { label: "Constancias",   href: "/empresa/constancias",  icon: Award },
]

const navEmpleado: NavItem[] = [
  { label: "Mis cursos",      href: "/empleado/cursos",      icon: BookOpen },
  { label: "Mis constancias", href: "/empleado/constancias", icon: Award },
]

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

function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function NavItemRow({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon

  if (collapsed) {
    return (
      <div className="group relative">
        <Link
          href={item.href}
          className={`flex items-center justify-center rounded-xl px-3 py-2.5 transition-colors ${
            active ? "bg-[#fff5ed] text-[#C45F0A]" : "text-[#64748b] hover:bg-[#f8f8f8] hover:text-[#1a1a1a]"
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </Link>
        <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {item.label}
        </span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      prefetch
      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
        active
          ? "bg-[#fff5ed] font-semibold text-[#C45F0A]"
          : "text-[#64748b] hover:bg-[#f8f8f8] hover:text-[#1a1a1a]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-sm bg-[#E8761A]" />
      )}
      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
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
  void empresa
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const initials = getInitials(nombre)

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
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-[#e8e8e8] bg-white transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo area */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-[#f0f0f0] ${
          collapsed ? "justify-center px-3" : "justify-between px-5"
        }`}
      >
        {collapsed ? (
          <button
            type="button"
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
            <div className="flex flex-col gap-1">
              <Link href={homeHref} className="block">
                <Image
                  src="/assets/logo_desarrolla_cropped.png"
                  alt="Desarrolla360"
                  width={150}
                  height={32}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </Link>
              {rol === "SUPERADMIN" && (
                <span className="inline-block w-fit rounded-full bg-[#E8761A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.8px] text-white">
                  SuperAdmin
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Contraer menú"
              className="flex size-7 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#f8f8f8] hover:text-[#1a1a1a]"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {rol === "SUPERADMIN" ? (
          navSuperAdminSections.map((section) => (
            <div key={section.heading} className="mb-1">
              {!collapsed && (
                <p className="mb-0.5 px-4 pt-3 text-[10px] font-bold uppercase tracking-[1.2px] text-[#aaa]">
                  {section.heading}
                </p>
              )}
              <div className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => (
                  <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-0.5 px-2">
            {(rol === "RH" ? navRH : navEmpleado).map((item) => (
              <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: perfil + config links for SUPERADMIN + logout + user identity */}
      <div className="shrink-0 border-t border-[#f0f0f0] px-2 py-2">
        {rol === "SUPERADMIN" && (
          <div className={`mb-1 ${collapsed ? "flex flex-col gap-0.5" : "grid grid-cols-2 gap-1"}`}>
            {collapsed ? (
              <>
                {[
                  { href: "/superadmin/perfil", icon: User, label: "Perfil" },
                  { href: "/superadmin/configuracion", icon: Settings, label: "Configuración" },
                ].map(({ href, icon: Icon, label }) => (
                  <div key={href} className="group relative">
                    <Link
                      href={href}
                      className={`flex items-center justify-center rounded-xl px-3 py-2.5 transition-colors ${
                        pathname === href
                          ? "bg-[#fff5ed] text-[#C45F0A]"
                          : "text-[#64748b] hover:bg-[#f8f8f8] hover:text-[#1a1a1a]"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </Link>
                    <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                      {label}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { href: "/superadmin/perfil", icon: User, label: "Perfil" },
                  { href: "/superadmin/configuracion", icon: Settings, label: "Config." },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition ${
                      pathname === href
                        ? "bg-[#fff5ed] text-[#C45F0A]"
                        : "text-[#64748b] hover:bg-[#f8f8f8] hover:text-[#1a1a1a]"
                    }`}
                  >
                    <Icon size={12} strokeWidth={2} />
                    {label}
                  </Link>
                ))}
              </>
            )}
          </div>
        )}

        {/* Logout */}
        {collapsed ? (
          <div className="group relative">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-[#64748b] transition hover:bg-rose-50 hover:text-rose-500"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} strokeWidth={1.8} />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              Cerrar sesión
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#64748b] transition hover:bg-rose-50 hover:text-rose-500"
          >
            <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        )}

        {/* User identity */}
        <div className={`mt-2 border-t border-[#f0f0f0] pt-2.5 ${collapsed ? "flex justify-center" : "px-1"}`}>
          {collapsed ? (
            <div className="group relative">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#E8761A] text-[11px] font-bold text-white">
                {initials}
              </div>
              <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {nombre}
                <span className="block text-[10px] font-normal text-slate-300">{roleLabel[rol]}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E8761A] text-[11px] font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{nombre}</p>
                <p className="text-[10px] text-[#94a3b8]">{roleLabel[rol]}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
