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
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/* Sidebar background — dark orange gradient */
const BG = "#FF8F00"

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean }
type NavSection = { heading: string; items: NavItem[] }
type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"

const navSuperAdminSections: NavSection[] = [
  {
    heading: "Principal",
    items: [
      { label: "Dashboard",      href: "/superadmin",             icon: LayoutDashboard, exact: true },
      { label: "Empresas",       href: "/superadmin/empresas",    icon: Building2 },
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
      { label: "Integración WP", href: "/superadmin/integracion", icon: Share2 },
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
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function NavItemRow({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={item.href}
              className={cn(
                "flex items-center justify-center rounded-md py-2 transition-all",
                active
                  ? "bg-black/20 text-white"
                  : "text-white/85 hover:bg-black/10 hover:text-white"
              )}
            />
          }
        >
          <Icon size={17} strokeWidth={active ? 2 : 1.7} />
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href={item.href}
      prefetch
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all",
        active
          ? "bg-black/20 text-white"
          : "text-white/85 hover:bg-black/10 hover:text-white"
      )}
    >
      <span
        className="flex size-[5px] shrink-0 rounded-full transition-all"
        style={{ background: active ? "white" : "rgba(255,255,255,0.4)" }}
      />
      <span className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        active ? "text-white" : "text-white/80"
      )}>
        <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export default function Sidebar({ rol, nombre, empresa }: { rol: Rol; nombre: string; empresa?: string }) {
  void empresa
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const initials = getInitials(nombre)

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("sidebar-collapsed") === "true") } catch {}
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
    <TooltipProvider delay={200}>
      <aside
        className="sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-300 ease-in-out"
        style={{ width: collapsed ? 64 : 240, background: BG }}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-[60px] shrink-0 items-center",
            collapsed ? "justify-center px-3" : "justify-between px-3"
          )}
          style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                onClick={toggle}
                aria-label="Expandir menú"
                className="rounded-lg p-1 transition-opacity hover:opacity-70"
              >
                <Image
                  src="/assets/logo_corta.png"
                  alt="D360"
                  width={30}
                  height={30}
                  className="size-[30px] object-contain brightness-0 invert"
                />
              </TooltipTrigger>
              <TooltipContent side="right">Expandir menú</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link href={homeHref} className="flex min-w-0 items-center gap-2.5 px-1">
                <Image
                  src="/assets/logo_desarrolla_cropped.png"
                  alt="D360"
                  width={108}
                  height={108}
                  className="size-[108px] shrink-0 object-contain brightness-0 invert"
                />
              </Link>
              <button
                type="button"
                onClick={toggle}
                aria-label="Contraer menú"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/40 transition-all hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft size={13} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-2 py-3">
          {rol === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <div key={section.heading} className={si > 0 ? "mt-1" : ""}>
                {!collapsed && (
                  <p className="mb-1 mt-4 px-3 text-[9px] font-bold uppercase tracking-[1.8px] text-white/65">
                    {section.heading}
                  </p>
                )}
                {collapsed && si > 0 && (
                  <div className="mx-2 my-2 h-px" style={{ background: "rgba(255,255,255,0.10)" }} />
                )}
                <div className="flex flex-col gap-px">
                  {section.items.map((item) => (
                    <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-px">
              {(rol === "RH" ? navRH : navEmpleado).map((item) => (
                <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Bottom */}
        <div
          className="shrink-0 px-2 pb-3 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        >
          {/* Logout */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Cerrar sesión"
                className="flex w-full items-center justify-center rounded-md p-2 text-white/80 transition-all hover:bg-black/10 hover:text-white"
              >
                <LogOut size={15} strokeWidth={1.8} />
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar sesión</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium text-white/80 transition-all hover:bg-black/10 hover:text-white"
            >
              <LogOut size={14} strokeWidth={1.8} className="shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          )}

          {/* User identity */}
          <div
            className={cn("mt-2 pt-2.5", collapsed ? "flex justify-center" : "px-1")}
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger className="cursor-default rounded-full focus-visible:outline-none">
                  <Avatar className="size-8 pointer-events-none">
                    <AvatarFallback className="bg-white/20 text-[11px] font-bold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{nombre}</p>
                  <p className="text-[10px] opacity-60">{roleLabel[rol]}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-white/20 text-[11px] font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{nombre}</p>
                  <p className="text-[10px] text-white/70">{roleLabel[rol]}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
