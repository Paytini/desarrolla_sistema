import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { KpiColorKey } from "@/lib/kpi-colors"

export type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"
export type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean; color: KpiColorKey }
export type NavSection = { heading: string; accent: string; items: NavItem[] }

export const defaultNavAccent = "var(--brand)"

export const navSuperAdminSections: NavSection[] = [
  {
    heading: "Principal",
    accent: "var(--brand)",
    items: [
      { label: "Dashboard",      href: "/superadmin",             icon: LayoutDashboard, exact: true, color: "primary" },
      { label: "Empresas",       href: "/superadmin/empresas",    icon: Building2,                    color: "violet" },
    ],
  },
  {
    heading: "Operaciones",
    accent: "var(--sidebar-accent-2)",
    items: [
      { label: "Paquetes",       href: "/superadmin/paquetes",    icon: Package,    color: "amber" },
      { label: "Editor DC-3",    href: "/superadmin/dc3",         icon: FileText,   color: "orange" },
      { label: "Reportes",       href: "/superadmin/reportes",    icon: BarChart3,  color: "emerald" },
      { label: "Accesos",        href: "/superadmin/accesos",     icon: Users,      color: "charcoal" },
    ],
  },
  {
    heading: "Sistema",
    accent: "var(--sidebar-accent-3)",
    items: [
      { label: "Integración WP", href: "/superadmin/integracion", icon: Share2, color: "pink" },
    ],
  },
]

export const navRH: NavItem[] = [
  { label: "Inicio",        href: "/empresa/inicio",       icon: LayoutDashboard, exact: true, color: "primary" },
  { label: "Empleados",     href: "/empresa/empleados",    icon: Users,                        color: "violet" },
  { label: "Asignaciones",  href: "/empresa/asignaciones", icon: ClipboardList,                color: "amber" },
  { label: "Progreso",      href: "/empresa/progreso",     icon: BarChart3,                    color: "emerald" },
  { label: "Constancias",   href: "/empresa/constancias",  icon: Award,                        color: "orange" },
]

export const navEmpleado: NavItem[] = [
  { label: "Mis cursos",      href: "/empleado/cursos",      icon: BookOpen, color: "emerald" },
  { label: "Mis constancias", href: "/empleado/constancias", icon: Award,    color: "orange" },
]

export const roleLabel: Record<Rol, string> = {
  SUPERADMIN: "SuperAdmin",
  RH:         "RH / Empresa",
  EMPLEADO:   "Empleado",
}

export function homeHrefForRole(rol: Rol) {
  return rol === "SUPERADMIN" ? "/superadmin"
    : rol === "RH"            ? "/empresa/inicio"
    :                           "/empleado/cursos"
}

export function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

const AVATAR_COLORS = [
  "#D96920", "#0D9488", "#6D28C4", "#0369A1",
  "#B45309", "#BE185D", "#15803D", "#7C3AED",
]

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
