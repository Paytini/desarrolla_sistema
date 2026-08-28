import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  Code2,
  FileText,
  LayoutDashboard,
  Package,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { companyPath } from "@/lib/company-routes"

export type Role = "SUPERADMIN" | "HR" | "EMPLOYEE"
export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  external?: boolean
}
export type NavSection = { heading: string; items: NavItem[] }

export const navSuperAdminSections: NavSection[] = [
  {
    heading: "Principal",
    items: [
      { label: "Dashboard", href: "/superadmin", icon: LayoutDashboard, exact: true },
      { label: "Empresas", href: "/superadmin/companies", icon: Building2 },
    ],
  },
  {
    heading: "Operaciones",
    items: [
      { label: "Paquetes", href: "/superadmin/packages", icon: Package },
      { label: "Editor DC-3", href: "/superadmin/dc3", icon: FileText },
      { label: "Reportes", href: "/superadmin/reports", icon: BarChart3 },
      { label: "Accesos", href: "/superadmin/access", icon: Users },
      { label: "Consultorías", href: "/superadmin/consulting", icon: CalendarClock },
    ],
  },
  {
    heading: "Sistema",
    items: [
      { label: "Integración WP", href: "/superadmin/integration", icon: Share2 },
      {
        label: "Documentación API",
        href: "/superadmin/api-docs",
        icon: Code2,
        external: true,
      },
    ],
  },
]

export function navHr(companySlug: string): NavItem[] {
  return [
    {
      label: "Inicio",
      href: companyPath(companySlug, "/home"),
      icon: LayoutDashboard,
      exact: true,
    },
    { label: "Empleados", href: companyPath(companySlug, "/employees"), icon: Users },
    { label: "Asignaciones", href: companyPath(companySlug, "/assignments"), icon: ClipboardList },
    { label: "Progreso", href: companyPath(companySlug, "/progress"), icon: BarChart3 },
    { label: "Consultoría", href: companyPath(companySlug, "/consulting"), icon: CalendarClock },
    { label: "Certificados", href: companyPath(companySlug, "/certificates"), icon: Award },
  ]
}

export const navEmployee: NavItem[] = [
  { label: "Mis cursos", href: "/employee/courses", icon: BookOpen },
  { label: "Mis constancias", href: "/employee/certificates", icon: Award },
]

export const roleLabel: Record<Role, string> = {
  SUPERADMIN: "SuperAdmin",
  HR: "HR / Empresa",
  EMPLOYEE: "Employee",
}

export function homeHrefForRole(role: Role, companySlug?: string) {
  return role === "SUPERADMIN"
    ? "/superadmin"
    : role === "HR"
      ? companyPath(companySlug ?? "", "/home")
      : "/employee/courses"
}

export function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export { getInitials } from "@/lib/format"

const AVATAR_COLORS = [
  "#D96920",
  "#0D9488",
  "#6D28C4",
  "#0369A1",
  "#B45309",
  "#BE185D",
  "#15803D",
  "#7C3AED",
]

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
