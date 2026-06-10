"use client"

import { ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  getInitials,
  homeHrefForRole,
  isActive,
  navEmpleado,
  navRH,
  navSuperAdminSections,
  roleLabel,
  type NavItem,
  type Rol,
} from "@/components/portal/nav-config"

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
                "sidebar-nav-link flex items-center justify-center rounded-lg py-2",
                active && "sidebar-nav-link--active"
              )}
            />
          }
        >
          <Icon size={22} strokeWidth={active ? 2 : 1.7} />
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
        "sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium",
        active && "sidebar-nav-link--active font-semibold"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md">
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export default function Sidebar({ rol, nombre, empresa }: { rol: Rol; nombre: string; empresa?: string }) {
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

  const homeHref = homeHrefForRole(rol)

  return (
    <TooltipProvider delay={200}>
      <aside
        className="relative sticky top-0 hidden h-screen shrink-0 flex-col font-[family-name:var(--font-bricolage)] transition-[width] duration-300 ease-in-out md:flex"
        style={{ width: collapsed ? 76 : 288 }}
      >
        <div className="sidebar-surface absolute inset-0 overflow-hidden rounded-r-3xl">
          <div className="sidebar-grain pointer-events-none absolute inset-0" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="sidebar-toggle absolute -right-4 top-5 z-30 flex size-8 items-center justify-center rounded-lg"
        >
          {collapsed
            ? <ChevronRight size={14} strokeWidth={2.5} />
            : <ChevronLeft  size={14} strokeWidth={2.5} />
          }
        </button>

        <div
          className={cn(
            "relative z-10 flex h-[68px] shrink-0 items-center",
            collapsed ? "justify-center px-3" : "px-4"
          )}
          style={{ borderBottom: "1px solid rgba(239,237,246,0.12)" }}
        >
          {collapsed ? (
            <Image
              src="/assets/logo_corta.png"
              alt="D360"
              width={34}
              height={34}
              className="size-[34px] object-contain brightness-0 invert"
            />
          ) : (
            <Link href={homeHref} className="flex min-w-0 items-center">
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={1554}
                height={461}
                className="h-9 w-auto object-contain brightness-0 invert"
              />
            </Link>
          )}
        </div>

        {!collapsed && empresa && rol !== "SUPERADMIN" && (
          <div className="sidebar-card relative z-10 mx-3 mt-3 shrink-0 rounded-lg px-3 py-2.5">
            <p className="sidebar-section-label text-[9px] font-bold uppercase tracking-[1.8px]">Empresa</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-[#EFEDF6]">{empresa}</p>
          </div>
        )}

        <ScrollArea className="relative z-10 flex-1 pl-2 pr-0 py-3">
          {rol === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <div key={section.heading} className={si > 0 ? "mt-1" : ""}>
                {!collapsed && (
                  <p className="sidebar-section-label mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-[1.8px]">
                    {section.heading}
                  </p>
                )}
                {collapsed && si > 0 && (
                  <div className="mx-2 my-2 h-px" style={{ background: "rgba(239,237,246,0.10)" }} />
                )}
                <div className="flex flex-col gap-0.5">
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

        <div
          className="relative z-10 shrink-0 px-2 pb-3 pt-2"
          style={{ borderTop: "1px solid rgba(239,237,246,0.10)" }}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Cerrar sesión"
                className="sidebar-nav-link flex w-full items-center justify-center rounded-lg p-2"
              >
                <LogOut size={18} strokeWidth={1.8} />
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar sesión</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="sidebar-nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium"
            >
              <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          )}

          <div
            className={cn("mt-2 pt-2.5", collapsed ? "flex justify-center" : "px-1")}
            style={{ borderTop: "1px solid rgba(239,237,246,0.10)" }}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger className="cursor-default rounded-full focus-visible:outline-none">
                  <Avatar className="size-9 pointer-events-none">
                    <AvatarFallback className="sidebar-avatar text-[12px] font-bold">
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
              <div className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="sidebar-avatar text-[11px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#EFEDF6]">{nombre}</p>
                  <p className="text-[11px] text-[#EFEDF6]/55">{roleLabel[rol]}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
