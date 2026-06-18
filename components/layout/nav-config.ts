export type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"
export type NavItem = { label: string; href: string; icon: string; exact?: boolean }
export type NavSection = { heading: string; accent: string; items: NavItem[] }

export const defaultNavAccent = "var(--brand)"

export const navSuperAdminSections: NavSection[] = [
  {
    heading: "Principal",
    accent: "var(--brand)",
    items: [
      { label: "Dashboard",      href: "/superadmin",             icon: "ri-home-smile-line",    exact: true },
      { label: "Empresas",       href: "/superadmin/empresas",    icon: "ri-building-2-line" },
    ],
  },
  {
    heading: "Operaciones",
    accent: "var(--sidebar-accent-2)",
    items: [
      { label: "Paquetes",       href: "/superadmin/paquetes",    icon: "ri-box-3-line" },
      { label: "Editor DC-3",    href: "/superadmin/dc3",         icon: "ri-file-text-line" },
      { label: "Reportes",       href: "/superadmin/reportes",    icon: "ri-bar-chart-line" },
      { label: "Accesos",        href: "/superadmin/accesos",     icon: "ri-group-line" },
    ],
  },
  {
    heading: "Sistema",
    accent: "var(--sidebar-accent-3)",
    items: [
      { label: "Integración WP", href: "/superadmin/integracion", icon: "ri-plug-line" },
    ],
  },
]

export const navRH: NavItem[] = [
  { label: "Inicio",        href: "/empresa/inicio",       icon: "ri-home-smile-line",   exact: true },
  { label: "Empleados",     href: "/empresa/empleados",    icon: "ri-group-line" },
  { label: "Asignaciones",  href: "/empresa/asignaciones", icon: "ri-clipboard-line" },
  { label: "Progreso",      href: "/empresa/progreso",     icon: "ri-bar-chart-line" },
  { label: "Constancias",   href: "/empresa/constancias",  icon: "ri-award-line" },
]

export const navEmpleado: NavItem[] = [
  { label: "Mis cursos",      href: "/empleado/cursos",      icon: "ri-book-open-line" },
  { label: "Mis constancias", href: "/empleado/constancias", icon: "ri-award-line" },
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
