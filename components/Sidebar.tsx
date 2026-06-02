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
      { label: "Dashboard",  href: "/superadmin",              icon: LayoutDashboard, exact: true },
      { label: "Empresas",   href: "/superadmin/empresas",     icon: Building2 },
    ],
  },
  {
    heading: "Operaciones",
    items: [
      { label: "Paquetes",       href: "/superadmin/paquetes",     icon: Package },
      { label: "Editor DC-3",    href: "/superadmin/dc3",          icon: FileText },
      { label: "Reportes",       href: "/superadmin/reportes",     icon: BarChart3 },
      { label: "Accesos",        href: "/superadmin/accesos",      icon: Users },
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
          className={`flex items-center justify-center rounded-xl px-3 py-2.5 transition-all duration-150 ${
            active
              ? "bg-[#F5853F]/15 text-[#F5853F]"
              : "text-white/55 hover:bg-white/8 hover:text-white/90"
          }`}
          style={active ? {} : undefined}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </Link>
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#F5853F]" />
        )}
        <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#000022] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
          {item.label}
        </span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      prefetch
      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
        active
          ? "bg-[#F5853F]/12 text-[#F5853F]"
          : "text-white/55 hover:bg-white/6 hover:text-white/90"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#F5853F]" />
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
      className={`sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
      style={{ background: "#000022" }}
    >
      {/* Logo area */}
      <div
        className={`flex h-16 shrink-0 items-center ${
          collapsed ? "justify-center px-3" : "justify-between px-5"
        }`}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
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
            <Link href={homeHref} className="flex flex-col gap-1">
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={150}
                height={32}
                className="h-8 w-auto object-contain brightness-0 invert"
                priority
              />
              {rol === "SUPERADMIN" && (
                <span
                  className="inline-block w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[1px] text-white/80"
                  style={{ background: "rgba(245,133,63,0.25)", border: "1px solid rgba(245,133,63,0.4)" }}
                >
                  SuperAdmin
                </span>
              )}
              {rol === "RH" && (
                <span
                  className="inline-block w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[1px] text-white/80"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  RH / Empresa
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label="Contraer menú"
              className="flex size-7 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/8 hover:text-white/80"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {rol === "SUPERADMIN" ? (
          navSuperAdminSections.map((section) => (
            <div key={section.heading} className="mb-1">
              {!collapsed && (
                <p
                  className="mb-0.5 px-4 pt-3 text-[9.5px] font-bold uppercase tracking-[1.4px]"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  {section.heading}
                </p>
              )}
              {collapsed && <div className="mx-3 my-2" style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />}
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

      {/* Bottom: perfil + config + logout + user */}
      <div
        className="shrink-0 px-2 py-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
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
                      className={`flex items-center justify-center rounded-xl px-3 py-2.5 transition-all duration-150 ${
                        pathname === href
                          ? "bg-[#F5853F]/15 text-[#F5853F]"
                          : "text-white/55 hover:bg-white/8 hover:text-white/90"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </Link>
                    <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#000022] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
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
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-all duration-150 ${
                      pathname === href
                        ? "bg-[#F5853F]/15 text-[#F5853F]"
                        : "text-white/55 hover:bg-white/8 hover:text-white/90"
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
              className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-white/40 transition-all duration-150 hover:bg-rose-500/15 hover:text-rose-400"
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} strokeWidth={1.8} />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#000022] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              Cerrar sesión
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/40 transition-all duration-150 hover:bg-rose-500/12 hover:text-rose-400"
          >
            <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        )}

        {/* User identity */}
        <div
          className={`mt-2 pt-2.5 ${collapsed ? "flex justify-center" : "px-1"}`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {collapsed ? (
            <div className="group relative">
              <div
                className="flex size-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ background: "#F5853F" }}
              >
                {initials}
              </div>
              <span className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#000022] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                {nombre}
                <span className="block text-[10px] font-normal text-white/50">{roleLabel[rol]}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ background: "#F5853F" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white/90">{nombre}</p>
                <p className="text-[10px] text-white/40">{roleLabel[rol]}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
