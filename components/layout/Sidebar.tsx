"use client"

import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { LifeBuoy } from "lucide-react"

import Box from "@mui/material/Box"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Typography from "@mui/material/Typography"

import {
  homeHrefForRole,
  isActive,
  navEmployee,
  navRH,
  navSuperAdminSections,
  type NavItem,
  type Rol,
} from "@/components/layout/nav-config"
import { kpiColorMap } from "@/lib/kpi-colors"

const SIDEBAR_W = 288

const SIDEBAR_FONT = 'var(--font-plus-jakarta-sans, "Plus Jakarta Sans"), system-ui, "Segoe UI", Arial, sans-serif'

const SIDEBAR_BG      = "var(--sidebar-bg-v4, #FFFFFF)"
const SIDEBAR_BORDER  = "var(--sidebar-border-v4, #E3D7F5)"
const SIDEBAR_OVERLAY = "var(--sidebar-overlay-v4, linear-gradient(to bottom, rgba(139,92,246,0) 0%, rgba(139,92,246,0.10) 45%, rgba(139,92,246,0.55) 100%))"

const ACCENT_MAP: Record<string, string> = {
  "var(--brand)":            "#3579F5",
  "var(--sidebar-accent-2)": "#3579F5",
  "var(--sidebar-accent-3)": "#3579F5",
}
const resolveAccent = (raw: string) => ACCENT_MAP[raw] ?? raw

function NavItemRow({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon   = item.icon
  const { bg, text } = kpiColorMap[item.color]
  const activeBg   = `var(--nav-active-bg, ${bg})`
  const activeText = `var(--nav-active-text, ${text})`
  const hoverBg     = `var(--nav-hover-bg, ${bg}14)`

  return (
    <Link href={item.href} prefetch style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <ListItemButton
        selected={active}
        sx={{
          borderRadius: "8px",
          mx: 1,
          mb: 0.25,
          px: 1.25,
          py: 0.875,
          minHeight: 40,
          gap: 1,
          color: "text.primary",
          "&.Mui-selected": {
            bgcolor: activeBg,
            color: activeText,
            "& .nav-icon": { color: activeText },
            "&:hover": { bgcolor: activeBg, filter: "brightness(0.94)" },
          },
          "&:hover:not(.Mui-selected)": {
            bgcolor: hoverBg,
            color: "text.primary",
            "& .nav-icon": { color: activeBg },
          },
          transition: "background-color 0.15s ease, color 0.15s ease",
        }}
      >
        <ListItemIcon
          className="nav-icon"
          sx={{
            minWidth: 0,
            mr: 0.5,
            color: active ? text : "inherit",
            transition: "color 0.15s ease",
            flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              sx: {
                fontFamily: SIDEBAR_FONT,
                fontSize: "0.875rem",
                fontWeight: active ? 700 : 600,
                letterSpacing: "0.01em",
                lineHeight: 1,
              },
            },
          }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </Link>
  )
}

export default function Sidebar({
  rol,
}: {
  rol: Rol
}) {
  const pathname = usePathname()
  const homeHref  = homeHrefForRole(rol)

  return (
    <Box
      component="aside"
      sx={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: SIDEBAR_W,
        flexShrink: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        overflow: "visible",
        zIndex: 20,
        fontFamily: SIDEBAR_FONT,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: SIDEBAR_BG,
          borderRight: "1px solid",
          borderColor: SIDEBAR_BORDER,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "55%",
            background: SIDEBAR_OVERLAY,
          }}
        />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            px: 2,
            borderBottom: "1px solid",
            borderColor: SIDEBAR_BORDER,
          }}
        >
          <Link href={homeHref} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={1554}
              height={461}
              style={{ height: 36, width: "auto", objectFit: "contain" }}
            />
          </Link>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1.5 }}>
          {rol === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <Box key={section.heading} sx={{ mt: si > 0 ? 0.5 : 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, mt: si > 0 ? 2 : 0.5, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: resolveAccent(section.accent),
                      flexShrink: 0,
                      boxShadow: `0 0 6px 0 ${resolveAccent(section.accent)}`,
                    }}
                  />
                  <Typography variant="overline" sx={{ fontFamily: SIDEBAR_FONT, color: resolveAccent(section.accent), lineHeight: 1 }}>
                    {section.heading}
                  </Typography>
                </Box>
                <List disablePadding>
                  {section.items.map((item) => (
                    <NavItemRow key={item.href} item={item} pathname={pathname} />
                  ))}
                </List>
              </Box>
            ))
          ) : (
            <List disablePadding>
              {(rol === "RH" ? navRH : navEmployee).map((item) => (
                <NavItemRow key={item.href} item={item} pathname={pathname} />
              ))}
            </List>
          )}
        </Box>

        {rol === "SUPERADMIN" && (
          <Box sx={{ px: 1.5, pb: 1.5, flexShrink: 0 }}>
            <Link href="/superadmin/integration" style={{ textDecoration: "none" }}>
              <Box
                sx={{
                  borderRadius: "14px",
                  bgcolor: "var(--panel-ink-v4, #161B23)",
                  px: 2,
                  py: 1.75,
                  transition: "transform 150ms ease",
                  "&:hover": { transform: "scale(1.015)" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                  <LifeBuoy size={15} strokeWidth={2} color="#3579F5" />
                  <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#3579F5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Soporte
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#FFFFFF", mb: 0.5 }}>
                  Centro de ayuda
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", lineHeight: 1.5, color: "rgba(255,255,255,0.6)" }}>
                  Guías de DC-3, integración WordPress y estado del sistema.
                </Typography>
              </Box>
            </Link>
          </Box>
        )}
      </Box>
    </Box>
  )
}
