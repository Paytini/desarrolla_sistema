"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  homeHrefForRole,
  isActive,
  navEmpleado,
  navRH,
  navSuperAdminSections,
  type NavItem,
  type Rol,
} from "@/components/portal/nav-config"

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "sidebar-nav-link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
        active && "sidebar-nav-link--active font-semibold"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md">
        <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function MobileNav({ rol, nombre, empresa }: { rol: Rol; nombre: string; empresa?: string }) {
  const pathname = usePathname()
  const homeHref = homeHrefForRole(rol)
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

      <SheetContent side="left" showCloseButton={false} className="sidebar-surface w-60 gap-0 overflow-hidden p-0">
        <div className="sidebar-grain pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

        <div
          className="relative z-10 flex h-[60px] shrink-0 items-center px-4"
          style={{ borderBottom: "1px solid rgba(239,237,246,0.12)" }}
        >
          <Link href={homeHref} className="flex items-center">
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={1554}
              height={461}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>
        </div>

        {empresa && rol !== "SUPERADMIN" && (
          <div className="sidebar-card relative z-10 mx-3 mt-3 shrink-0 rounded-lg px-3 py-2.5">
            <p className="sidebar-section-label text-[9px] font-bold uppercase tracking-[1.8px]">Empresa</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-[#EFEDF6]">{empresa}</p>
          </div>
        )}

        <div className="relative z-10 flex-1 overflow-y-auto px-2 py-3">
          {rol === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <div key={section.heading} className={si > 0 ? "mt-1" : ""}>
                <p className="sidebar-section-label mb-1 mt-4 px-3 text-[9px] font-bold uppercase tracking-[1.8px]">
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

        <div
          className="relative z-10 shrink-0 px-2 pb-4 pt-2"
          style={{ borderTop: "1px solid rgba(239,237,246,0.10)" }}
        >
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-nav-link flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium"
          >
            <LogOut size={14} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
          <div
            className="mt-2 px-1 pt-2.5"
            style={{ borderTop: "1px solid rgba(239,237,246,0.10)" }}
          >
            <p className="truncate text-[12px] font-semibold text-[#EFEDF6]">{nombre}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
