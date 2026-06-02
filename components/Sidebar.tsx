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
          className="flex items-center justify-center rounded-xl p-2.5 transition-all duration-150"
          style={
            active
              ? { background: "#F5853F", color: "#fff" }
              : { color: "rgba(255,255,255,0.45)" }
          }
          onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)" }}
          onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)" }}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </Link>
        <span
          className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
          style={{ background: "#000022", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {item.label}
        </span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      prefetch
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150"
      style={
        active
          ? { background: "#F5853F", color: "#fff", fontWeight: 600 }
          : { color: "rgba(255,255,255,0.45)" }
      }
      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" } }}
      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; (e.currentTarget as HTMLElement).style.background = "transparent" } }}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg"
        style={active ? { background: "rgba(255,255,255,0.2)" } : { background: "rgba(255,255,255,0.06)" }}
      >
        <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
      </span>
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
      className={`sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-300 ease-in-out`}
      style={{
        background: "#000022",
        width: collapsed ? 68 : 240,
      }}
    >
      {/* Logo area */}
      <div
        className={`flex h-[60px] shrink-0 items-center ${collapsed ? "justify-center px-3" : "justify-between px-4"}`}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggle}
            aria-label="Expandir menú"
            className="rounded-xl p-1 transition-opacity hover:opacity-75"
          >
            <Image
              src="/assets/logo_corta.png"
              alt="D360"
              width={34}
              height={34}
              className="size-[34px] object-contain"
            />
          </button>
        ) : (
          <>
            <Link href={homeHref} className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/assets/logo_corta.png"
                alt="D360"
                width={30}
                height={30}
                className="size-[30px] shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-white leading-tight">Desarrolla360</p>
                <p className="text-[10px] font-medium leading-tight" style={{ color: "#F5853F" }}>
                  {roleLabel[rol]}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label="Contraer menú"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg transition"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {rol === "SUPERADMIN" ? (
          navSuperAdminSections.map((section, si) => (
            <div key={section.heading} className={si > 0 ? "mt-1" : ""}>
              {!collapsed && (
                <p
                  className="mb-1 mt-4 px-2 text-[9.5px] font-bold uppercase tracking-[1.5px]"
                  style={{ color: "rgba(255,255,255,0.22)" }}
                >
                  {section.heading}
                </p>
              )}
              {collapsed && si > 0 && (
                <div className="my-3 mx-2" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-0.5">
            {(rol === "RH" ? navRH : navEmpleado).map((item) => (
              <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div
        className="shrink-0 px-2 pb-3 pt-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Perfil + Configuración links for SUPERADMIN */}
        {rol === "SUPERADMIN" && (
          <div className={`mb-1 ${collapsed ? "flex flex-col gap-0.5" : "grid grid-cols-2 gap-1"}`}>
            {[
              { href: "/superadmin/perfil", icon: User, label: "Perfil" },
              { href: "/superadmin/configuracion", icon: Settings, label: collapsed ? "Config." : "Config." },
            ].map(({ href, icon: Icon, label }) => {
              const isItemActive = pathname === href
              if (collapsed) {
                return (
                  <div key={href} className="group relative">
                    <Link
                      href={href}
                      className="flex items-center justify-center rounded-xl p-2.5 transition-all duration-150"
                      style={isItemActive ? { background: "#F5853F", color: "#fff" } : { color: "rgba(255,255,255,0.4)" }}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </Link>
                    <span
                      className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
                      style={{ background: "#000022", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {label}
                    </span>
                  </div>
                )
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-all duration-150"
                  style={isItemActive ? { background: "#F5853F", color: "#fff" } : { color: "rgba(255,255,255,0.4)" }}
                >
                  <Icon size={12} strokeWidth={2} />
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Logout */}
        {collapsed ? (
          <div className="group relative">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-150"
              style={{ color: "rgba(255,255,255,0.35)" }}
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} strokeWidth={1.8} />
            </button>
            <span
              className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
              style={{ background: "#000022", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cerrar sesión
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-medium transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        )}

        {/* User identity */}
        <div
          className={`mt-2 pt-2.5 ${collapsed ? "flex justify-center" : "px-1"}`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {collapsed ? (
            <div className="group relative">
              <div
                className="flex size-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ background: "#F5853F" }}
              >
                {initials}
              </div>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
                style={{ background: "#000022", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {nombre}
                <span className="block text-[10px] font-normal" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {roleLabel[rol]}
                </span>
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
                <p className="truncate text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {nombre}
                </p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {roleLabel[rol]}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
