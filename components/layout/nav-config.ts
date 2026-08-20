import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { KpiColorKey } from "@/lib/kpi-colors"
import { companyPath } from "@/lib/company-routes"

export type Role = "SUPERADMIN" | "HR" | "EMPLOYEE"
export type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean; color: KpiColorKey }
export type NavSection = { heading: string; accent: string; items: NavItem[] }

export const defaultNavAccent = "var(--brand)"

export const navSuperAdminSections: NavSection[] = [
  {
    heading: "Principal",
    accent: "var(--brand)",
    items: [
      { label: "Dashboard",      href: "/superadmin",             icon: LayoutDashboard, exact: true, color: "primary" },
      { label: "Empresas",       href: "/superadmin/companies",    icon: Building2,                    color: "violet" },
    ],
  },
  {
    heading: "Operaciones",
    accent: "var(--sidebar-accent-2)",
    items: [
      { label: "Paquetes",       href: "/superadmin/packages",    icon: Package,        color: "amber" },
      { label: "Editor DC-3",    href: "/superadmin/dc3",         icon: FileText,       color: "orange" },
      { label: "Reportes",       href: "/superadmin/reports",    icon: BarChart3,       color: "emerald" },
      { label: "Accesos",        href: "/superadmin/access",     icon: Users,           color: "charcoal" },
      { label: "Consultorías",   href: "/superadmin/consulting", icon: CalendarClock,   color: "rose" },
    ],
  },
  {
    heading: "Sistema",
    accent: "var(--sidebar-accent-3)",
    items: [
      { label: "Integración WP", href: "/superadmin/integration", icon: Share2, color: "pink" },
    ],
  },
]

export function navHr(companySlug: string): NavItem[] {
  return [
    { label: "Inicio",        href: companyPath(companySlug, "/home"),         icon: LayoutDashboard, exact: true, color: "primary" },
    { label: "Empleados",     href: companyPath(companySlug, "/employees"),    icon: Users,                        color: "violet" },
    { label: "Asignaciones",  href: companyPath(companySlug, "/assignments"),  icon: ClipboardList,                color: "amber" },
    { label: "Progreso",      href: companyPath(companySlug, "/progress"),     icon: BarChart3,                    color: "emerald" },
    { label: "Consultoría",   href: companyPath(companySlug, "/consulting"),   icon: CalendarClock,                color: "pink" },
    { label: "Constancias",   href: companyPath(companySlug, "/certificates"), icon: Award,                        color: "orange" },
  ]
}

export const navEmployee: NavItem[] = [
  { label: "Mis cursos",      href: "/employee/courses",      icon: BookOpen, color: "emerald" },
  { label: "Mis constancias", href: "/employee/certificates", icon: Award,    color: "orange" },
]

export const roleLabel: Record<Role, string> = {
  SUPERADMIN: "SuperAdmin",
  HR:         "HR / Empresa",
  EMPLOYEE:   "Employee",
}

export function homeHrefForRole(role: Role, companySlug?: string) {
  return role === "SUPERADMIN" ? "/superadmin"
    : role === "HR"            ? companyPath(companySlug ?? "", "/home")
    :                           "/employee/courses"
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
