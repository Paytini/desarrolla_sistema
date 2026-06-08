"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  BarChart3,
  Award,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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
      { label: "Rutas",          href: "/superadmin/rutas",       icon: Map },
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
  { label: "Inicio",       href: "/empresa/inicio",       icon: LayoutDashboard, exact: true },
  { label: "Empleados",    href: "/empresa/empleados",    icon: Users },
  { label: "Asignaciones", href: "/empresa/asignaciones", icon: ClipboardList },
  { label: "Progreso",     href: "/empresa/progreso",     icon: BarChart3 },
  { label: "Constancias",  href: "/empresa/constancias",  icon: Award },
]

const navEmpleado: NavItem[] = [
  { label: "Mis cursos",      href: "/empleado/cursos",      icon: BookOpen },
  { label: "Mis constancias", href: "/empleado/constancias", icon: Award },
]

function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all"
      style={active
        ? { background: "rgba(0,0,0,0.18)", color: "#fff" }
        : { color: "rgba(255,255,255,0.75)" }
      }
    >
      <span
        className="flex size-[5px] shrink-0 rounded-full"
        style={{ background: active ? "#fff" : "rgba(255,255,255,0.3)" }}
      />
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md">
        <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function MobileNav({ rol, nombre }: { rol: Rol; nombre: string }) {
  const pathname = usePathname()

  const homeHref =
    rol === "SUPERADMIN" ? "/superadmin"
    : rol === "RH"       ? "/empresa/inicio"
    :                      "/empleado/cursos"

  const flatItems = rol === "RH" ? navRH : navEmpleado

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Abrir menú"
            className="flex items-center justify-center rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
          />
        }
      >
        <Menu size={18} strokeWidth={2} />
      </SheetTrigger>

      <SheetContent side="left" showCloseButton={false} className="w-60 gap-0 p-0" style={{ background: BG }}>
        {/* Logo */}
        <div
          className="flex h-[60px] shrink-0 items-center px-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
        >
          <Link href={homeHref} className="flex items-center px-1">
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={108}
              height={108}
              className="size-[108px] object-contain brightness-0 invert"
            />
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {rol === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <div key={section.heading} className={si > 0 ? "mt-1" : ""}>
                <p className="mb-1 mt-4 px-3 text-[9px] font-bold uppercase tracking-[1.8px] text-white/65">
                  {section.heading}
                </p>
                <div className="flex flex-col gap-px">
                  {section.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-px">
              {flatItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-2 pb-4 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        >
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium text-white/80 transition-all hover:bg-black/10 hover:text-white"
          >
            <LogOut size={14} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
          <div
            className="mt-2 px-1 pt-2.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
          >
            <p className="truncate text-[12px] font-semibold text-white">{nombre}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
