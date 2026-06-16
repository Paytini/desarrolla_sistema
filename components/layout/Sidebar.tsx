"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react"

import Avatar from "@mui/material/Avatar"
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
  getInitials,
  homeHrefForRole,
  isActive,
  navEmpleado,
  navRH,
  navSuperAdminSections,
  roleLabel,
  type NavItem,
  type Rol,
} from "@/components/layout/nav-config"

const COLLAPSED_W = 76
const EXPANDED_W  = 288

const ACCENT_MAP: Record<string, string> = {
  "var(--brand)":             "#F5853F",
  "var(--sidebar-accent-2)":  "#2DD4BF",
  "var(--sidebar-accent-3)":  "#A78BFA",
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
        color: active ? "text.primary" : "text.secondary",
        "&.Mui-selected": {
          bgcolor: `${c}1A`,
          color: "text.primary",
          boxShadow: `inset 3px 0 0 0 ${c}`,
          "& .nav-icon": { color: c },
          "&:hover": { bgcolor: `${c}24` },
        },
        "&:hover:not(.Mui-selected)": {
          bgcolor: `${c}0D`,
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
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                letterSpacing: "-0.01em",
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
    <Link
      href={item.href}
      prefetch
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
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
  nombre,
  empresa,
}: {
  rol: Rol
  nombre: string
  empresa?: string
}) {
  const pathname  = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const initials  = getInitials(nombre)
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
      }}
    >
      {/* background + right border */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />

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
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 2px 8px rgba(0,0,34,0.10)",
          "&:hover": {
            bgcolor: "background.paper",
            borderColor: "primary.main",
            boxShadow: "0 0 12px -2px rgba(245,133,63,0.45)",
          },
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {collapsed
          ? <ChevronRight size={13} strokeWidth={2.5} />
          : <ChevronLeft  size={13} strokeWidth={2.5} />
        }
      </IconButton>

      {/* inner content — clips overflow */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Logo row */}
        <Box
          sx={{
            height: 76,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 1.5 : 2,
            borderBottom: "1px solid",
            borderColor: "divider",
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
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="overline"
              sx={{ display: "block", color: "primary.main", lineHeight: 1, mb: 0.5 }}
            >
              Empresa
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
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
                  si > 0 && <Divider sx={{ mx: 1.5, my: 1 }} />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2.5,
                      mt: si > 0 ? 2 : 0.5,
                      mb: 0.75,
                    }}
                  >
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
                    <Typography
                      variant="overline"
                      sx={{ color: resolveAccent(section.accent), lineHeight: 1 }}
                    >
                      {section.heading}
                    </Typography>
                  </Box>
                )}
                <List disablePadding>
                  {section.items.map((item) => (
                    <NavItemRow
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      pathname={pathname}
                      accentColor={section.accent}
                    />
                  ))}
                </List>
              </Box>
            ))
          ) : (
            <List disablePadding>
              {(rol === "RH" ? navRH : navEmpleado).map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  accentColor={defaultNavAccent}
                />
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ flexShrink: 0, px: 1, pt: 1, pb: 0.5 }}>
          {collapsed ? (
            <Tooltip title="Cerrar sesión" placement="right" arrow>
              <IconButton
                onClick={() => signOut({ callbackUrl: "/login" })}
                size="small"
                sx={{
                  width: "100%",
                  borderRadius: "8px",
                  py: 1,
                  color: "text.secondary",
                  "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                }}
              >
                <LogOut size={18} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
          ) : (
            <Box
              component="button"
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
                px: 1.25,
                py: 1,
                borderRadius: "8px",
                border: "none",
                bgcolor: "transparent",
                cursor: "pointer",
                color: "text.secondary",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                transition: "background-color 0.15s ease, color 0.15s ease",
              }}
            >
              <LogOut size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <span>Cerrar sesión</span>
            </Box>
          )}
        </Box>
        <Divider />

        {/* Avatar */}
        <Box
          sx={{
            flexShrink: 0,
            px: 1,
            py: 1.5,
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? (
            <Tooltip title={`${nombre} · ${roleLabel[rol]}`} placement="right" arrow>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: 12,
                  background: "linear-gradient(135deg,#F5853F,#A78BFA)",
                  color: "#fff",
                  cursor: "default",
                }}
              >
                {initials}
              </Avatar>
            </Tooltip>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 0.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: 12,
                  background: "linear-gradient(135deg,#F5853F,#A78BFA)",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "text.primary",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {nombre}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 11 }}>
                  {roleLabel[rol]}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
