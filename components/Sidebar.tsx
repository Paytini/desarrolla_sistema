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
  defaultNavAccent,
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

function NavItemRow({
  item,
  collapsed,
  pathname,
  delayIndex,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  delayIndex: number
}) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon
  const style = { animationDelay: `${Math.min(delayIndex, 12) * 30}ms` }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={item.href}
              style={style}
              className={cn(
                "sidebar-nav-link flex items-center justify-center rounded-lg py-2",
                active && "sidebar-nav-link--active"
              )}
            />
          }
        >
          <span className="sidebar-nav-icon flex items-center justify-center">
            <Icon size={22} strokeWidth={active ? 2 : 1.7} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      href={item.href}
      prefetch
      style={style}
      className={cn(
        "sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium",
        active && "sidebar-nav-link--active font-semibold"
      )}
    >
      <span className="sidebar-nav-icon flex size-8 shrink-0 items-center justify-center rounded-md">
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
        className="relative sticky top-0 hidden h-screen shrink-0 flex-col font-[family-name:var(--font-plus-jakarta-sans)] transition-[width] duration-300 ease-in-out md:flex"
        style={{ width: collapsed ? 76 : 288 }}
      >
        <div className="sidebar-surface absolute inset-0">
          <div className="sidebar-aurora" />
          <div className="sidebar-grain" />
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          className="sidebar-toggle absolute -right-3.5 top-5 z-30 flex size-7 items-center justify-center rounded-full"
        >
          {collapsed
            ? <ChevronRight size={14} strokeWidth={2.5} />
            : <ChevronLeft  size={14} strokeWidth={2.5} />
          }
        </button>

        <div
          className={cn(
            "relative z-10 flex h-[68px] shrink-0 items-center border-b border-white/10",
            collapsed ? "justify-center px-3" : "px-4"
          )}
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
            <p className="mt-0.5 truncate text-[13px] font-semibold text-[#F5F4FA]">{empresa}</p>
          </div>
        )}

        <ScrollArea className="relative z-10 flex-1 pl-2 pr-0 py-3">
          {rol === "SUPERADMIN" ? (
            (() => {
              let runningIndex = 0
              return navSuperAdminSections.map((section, si) => (
                <div
                  key={section.heading}
                  className={si > 0 ? "mt-1" : ""}
                  style={{ "--nav-accent": section.accent } as React.CSSProperties}
                >
                  {!collapsed && (
                    <p className="sidebar-section-label mb-1 mt-4 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-[1.8px]">
                      <span className="sidebar-section-dot inline-block size-1.5 rounded-full" />
                      {section.heading}
                    </p>
                  )}
                  {collapsed && si > 0 && (
                    <div className="mx-2 my-2 h-px bg-white/10" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <NavItemRow
                        key={item.href}
                        item={item}
                        collapsed={collapsed}
                        pathname={pathname}
                        delayIndex={runningIndex++}
                      />
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
              {(rol === "RH" ? navRH : navEmpleado).map((item, i) => (
                <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} delayIndex={i} />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="relative z-10 shrink-0 border-t border-white/10 px-2 pb-3 pt-2">
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
            className={cn("mt-2 border-t border-white/10 pt-2.5", collapsed ? "flex justify-center" : "px-1")}
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
                  <p className="truncate text-[14px] font-semibold text-[#F5F4FA]">{nombre}</p>
                  <p className="text-[11px] text-[#F5F4FA]/55">{roleLabel[rol]}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
