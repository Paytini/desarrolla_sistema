"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

type NavItem = { label: string; href: string }

const navSuperAdmin: NavItem[] = [
  { label: "Empresas",         href: "/superadmin/empresas" },
  { label: "Paquetes",         href: "/superadmin/paquetes" },
  { label: "Reportes globales",href: "/superadmin/reportes" },
  { label: "Integración",      href: "/superadmin/integracion" },
  { label: "Accesos",          href: "/superadmin/accesos" },
]

const navRH: NavItem[] = [
  { label: "Inicio",           href: "/empresa/inicio" },
  { label: "Empleados",        href: "/empresa/empleados" },
  { label: "Asignaciones",     href: "/empresa/asignaciones" },
  { label: "Progreso",         href: "/empresa/progreso" },
  { label: "Constancias",      href: "/empresa/constancias" },
]

const navEmpleado: NavItem[] = [
  { label: "Mis cursos",       href: "/empleado/cursos" },
  { label: "Mi progreso",      href: "/empleado/progreso" },
  { label: "Mis constancias",  href: "/empleado/constancias" },
]

type Rol = "SUPERADMIN" | "RH" | "EMPLEADO"

const navByRol: Record<Rol, NavItem[]> = {
  SUPERADMIN: navSuperAdmin,
  RH:         navRH,
  EMPLEADO:   navEmpleado,
}

const badgeByRol: Record<Rol, { label: string; className: string }> = {
  SUPERADMIN: { label: "SuperAdmin",   className: "bg-teal-50 text-teal-800" },
  RH:         { label: "RH / Empresa", className: "bg-purple-50 text-purple-800" },
  EMPLEADO:   { label: "Empleado",     className: "bg-amber-50 text-amber-800" },
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
  const pathname = usePathname()
  const items    = navByRol[rol]
  const badge    = badgeByRol[rol]

  return (
    <aside className="sticky top-0 h-screen w-52 shrink-0 overflow-hidden border-r border-gray-100 bg-white">
      <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-base font-medium">
          Desarrolla<span className="text-purple-600">360</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Portal empresarial</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-purple-50 text-purple-700 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="border-t border-gray-100 px-4 py-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        <p className="text-sm font-medium text-gray-800 mt-2 truncate">{nombre}</p>
        {empresa && (
          <p className="text-xs text-gray-400 truncate">{empresa}</p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
      </div>
    </aside>
  )
}
