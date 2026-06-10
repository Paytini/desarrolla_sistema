import {
  BarChart3,
  Award,
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

export type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"
export type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean }
export type NavSection = { heading: string; items: NavItem[] }

export const navSuperAdminSections: NavSection[] = [
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

export const navRH: NavItem[] = [
  { label: "Inicio",        href: "/empresa/inicio",       icon: LayoutDashboard, exact: true },
  { label: "Empleados",     href: "/empresa/empleados",    icon: Users },
  { label: "Asignaciones",  href: "/empresa/asignaciones", icon: ClipboardList },
  { label: "Progreso",      href: "/empresa/progreso",     icon: BarChart3 },
  { label: "Constancias",   href: "/empresa/constancias",  icon: Award },
]

export const navEmpleado: NavItem[] = [
  { label: "Mis cursos",      href: "/empleado/cursos",      icon: BookOpen },
  { label: "Mis constancias", href: "/empleado/constancias", icon: Award },
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
