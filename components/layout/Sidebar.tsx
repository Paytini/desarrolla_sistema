"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"

import {
  defaultNavAccent,
  homeHrefForRole,
  isActive,
  navEmpleado,
  navRH,
  navSuperAdminSections,
  type NavItem,
  type Rol,
} from "@/components/layout/nav-config"

const COLLAPSED_W = 76
const EXPANDED_W  = 288

const SIDEBAR_FONT = '"Plus Jakarta Sans", system-ui, "Segoe UI", Arial, sans-serif'

const SIDEBAR_BG      = "#FFFFFF"
const SIDEBAR_BORDER  = "#E3D7F5"
const SIDEBAR_CHIP_BG = "#FFFFFF"
const SIDEBAR_OVERLAY = "linear-gradient(to bottom, rgba(139,92,246,0) 0%, rgba(139,92,246,0.10) 45%, rgba(139,92,246,0.55) 100%)"

const ACCENT_MAP: Record<string, string> = {
  "var(--brand)":            "#F5853F",
  "var(--sidebar-accent-2)": "#34D399",
  "var(--sidebar-accent-3)": "#3B82F6",
}
const resolveAccent = (raw: string) => ACCENT_MAP[raw] ?? raw

function NavItemRow({
  item,
  collapsed,
  pathname,
  accentColor,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  accentColor: string
}) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon   = item.icon
  const c      = resolveAccent(accentColor)

  const button = (
    <ListItemButton
      selected={active}
      sx={{
        borderRadius: "8px",
        mx: 1,
        mb: 0.25,
        px: 1.25,
        py: 0.875,
        minHeight: 40,
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 1,
        color: "text.primary",
        "&.Mui-selected": {
          bgcolor: `${c}1F`,
          color: "text.primary",
          boxShadow: `inset 3px 0 0 0 ${c}`,
          "& .nav-icon": { color: c },
          "&:hover": { bgcolor: `${c}2A` },
        },
        "&:hover:not(.Mui-selected)": {
          bgcolor: "rgba(255,255,255,0.55)",
          color: "text.primary",
          "& .nav-icon": { color: c },
        },
        transition: "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <ListItemIcon
        className="nav-icon"
        sx={{
          minWidth: 0,
          mr: collapsed ? 0 : 0.5,
          color: active ? c : "inherit",
          transition: "color 0.15s ease",
          flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      </ListItemIcon>
      {!collapsed && (
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
      )}
    </ListItemButton>
  )

  const linked = (
    <Link href={item.href} prefetch style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      {button}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right" arrow>
        {linked}
      </Tooltip>
    )
  }

  return linked
}

export default function Sidebar({
  rol,
  empresa,
}: {
  rol: Rol
  empresa?: string
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const homeHref  = homeHrefForRole(rol)

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

  return (
    <Box
      component="aside"
      sx={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: collapsed ? COLLAPSED_W : EXPANDED_W,
        flexShrink: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        overflow: "visible",
        transition: "width 0.3s ease",
        zIndex: 20,
        fontFamily: SIDEBAR_FONT,
      }}
    >
      {/* background + right border */}
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
        {/* orange overlay — fades in across the bottom half */}
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

      {/* collapse toggle */}
      <IconButton
        onClick={toggle}
        size="small"
        aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        sx={{
          position: "absolute",
          right: -14,
          top: 22,
          zIndex: 30,
          width: 28,
          height: 28,
          p: 0,
          bgcolor: "#FFFFFF",
          border: "1px solid",
          borderColor: SIDEBAR_BORDER,
          boxShadow: "0 2px 8px rgba(124,58,237,0.18)",
          "&:hover": {
            bgcolor: "#FFFFFF",
            borderColor: "#8B5CF6",
            boxShadow: "0 0 12px -2px rgba(139,92,246,0.55)",
          },
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {collapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
      </IconButton>

      {/* inner content — clips overflow */}
      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Logo row */}
        <Box
          sx={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 1.5 : 2,
            borderBottom: "1px solid",
            borderColor: SIDEBAR_BORDER,
          }}
        >
          {collapsed ? (
            <Image
              src="/assets/logo_corta.png"
              alt="D360"
              width={34}
              height={34}
              style={{ objectFit: "contain", width: 34, height: 34 }}
            />
          ) : (
            <Link href={homeHref} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={1554}
                height={461}
                style={{ height: 36, width: "auto", objectFit: "contain" }}
              />
            </Link>
          )}
        </Box>

        {/* Empresa chip */}
        {!collapsed && empresa && rol !== "SUPERADMIN" && (
          <Box
            sx={{
              mx: 1.5,
              mt: 1.5,
              flexShrink: 0,
              px: 1.5,
              py: 1.25,
              borderRadius: "8px",
              bgcolor: SIDEBAR_CHIP_BG,
              border: "1px solid",
              borderColor: SIDEBAR_BORDER,
            }}
          >
            <Typography variant="overline" sx={{ fontFamily: SIDEBAR_FONT, display: "block", color: "#7C3AED", lineHeight: 1, mb: 0.5 }}>
              Empresa
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: SIDEBAR_FONT, fontWeight: 600, color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {empresa}
            </Typography>
          </Box>
        )}

        {/* Navigation */}
        <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1.5 }}>
          {rol === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <Box key={section.heading} sx={{ mt: si > 0 ? 0.5 : 0 }}>
                {collapsed ? (
                  si > 0 && <Divider sx={{ mx: 1.5, my: 1, borderColor: SIDEBAR_BORDER }} />
                ) : (
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
                )}
                <List disablePadding>
                  {section.items.map((item) => (
                    <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} accentColor={section.accent} />
                  ))}
                </List>
              </Box>
            ))
          ) : (
            <List disablePadding>
              {(rol === "RH" ? navRH : navEmpleado).map((item) => (
                <NavItemRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} accentColor={defaultNavAccent} />
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Box>
  )
}
