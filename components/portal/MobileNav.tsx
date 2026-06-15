"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  defaultNavAccent,
  homeHrefForRole,
  isActive,
  navEmpleado,
  navRH,
  navSuperAdminSections,
  type NavItem,
  type Rol,
} from "@/components/portal/nav-config"

function NavLink({ item, pathname, delayIndex }: { item: NavItem; pathname: string; delayIndex: number }) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      style={{ animationDelay: `${Math.min(delayIndex, 12) * 30}ms` }}
      className={cn(
        "sidebar-nav-link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
        active && "sidebar-nav-link--active font-semibold"
      )}
    >
      <span className="sidebar-nav-icon flex size-6 shrink-0 items-center justify-center rounded-md">
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
        <div className="sidebar-aurora" />
        <div className="sidebar-grain" />

        <div className="relative z-10 flex h-[60px] shrink-0 items-center border-b border-white/10 px-4">
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
            <p className="mt-0.5 truncate text-[13px] font-semibold text-[#F5F4FA]">{empresa}</p>
          </div>
        )}

        <div className="relative z-10 flex-1 overflow-y-auto px-2 py-3">
          {rol === "SUPERADMIN" ? (
            (() => {
              let runningIndex = 0
              return navSuperAdminSections.map((section, si) => (
                <div
                  key={section.heading}
                  className={si > 0 ? "mt-1" : ""}
                  style={{ "--nav-accent": section.accent } as React.CSSProperties}
                >
                  <p className="sidebar-section-label mb-1 mt-4 flex items-center gap-1.5 px-3 text-[9px] font-bold uppercase tracking-[1.8px]">
                    <span className="sidebar-section-dot inline-block size-1.5 rounded-full" />
                    {section.heading}
                  </p>
                  <div className="flex flex-col gap-px">
                    {section.items.map((item) => (
                      <NavLink key={item.href} item={item} pathname={pathname} delayIndex={runningIndex++} />
                    ))}
                  </div>
                </div>
              ))
            })()
          ) : (
            <div
              className="flex flex-col gap-px"
              style={{ "--nav-accent": defaultNavAccent } as React.CSSProperties}
            >
              {flatItems.map((item, i) => (
                <NavLink key={item.href} item={item} pathname={pathname} delayIndex={i} />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 shrink-0 border-t border-white/10 px-2 pb-4 pt-2">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-nav-link flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium"
          >
            <LogOut size={14} strokeWidth={1.8} className="shrink-0" />
            <span>Cerrar sesión</span>
          </button>
          <div className="mt-2 border-t border-white/10 px-1 pt-2.5">
            <p className="truncate text-[12px] font-semibold text-[#F5F4FA]">{nombre}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
