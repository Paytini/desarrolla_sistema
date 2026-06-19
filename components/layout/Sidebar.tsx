"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

import Box from "@mui/material/Box"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
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

const EW = 260

const ACCENT_MAP: Record<string, string> = {
  "var(--brand)":            "#F5853F",
  "var(--sidebar-accent-2)": "#34D399",
  "var(--sidebar-accent-3)": "#8B5CF6",
}
const ra = (raw: string) => ACCENT_MAP[raw] ?? raw

function NavItemRow({ item, pathname, accentColor }: { item: NavItem; pathname: string; accentColor: string }) {
  const active = isActive(item.href, pathname, item.exact)
  const accent = ra(accentColor)

  return (
    <Link href={item.href} prefetch style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <ListItemButton
        selected={active}
        sx={{
          borderStartStartRadius: 0,
          borderEndStartRadius: 0,
          borderStartEndRadius: "9999px",
          borderEndEndRadius: "9999px",
          mx: 0,
          mb: 0.5,
          pl: "44px",
          pr: "28px",
          py: "10px",
          minHeight: 44,
          color: "#64748B",
          transition: "background 0.2s ease, color 0.2s ease",
          "&.Mui-selected": {
            background: `linear-gradient(270deg, ${accent}, color-mix(in srgb, ${accent} 60%, white))`,
            color: "#fff",
            boxShadow: `3px 0px 0px 0px ${accent} inset`,
            "& .sb-icon": { color: "#fff" },
            "&:hover": { background: `linear-gradient(270deg, ${accent}, color-mix(in srgb, ${accent} 60%, white))` },
          },
          "&:hover:not(.Mui-selected)": {
            bgcolor: "rgba(139,92,246,0.06)",
            color: "#1E293B",
            "& .sb-icon": { color: "#1E293B" },
          },
        }}
      >
        <ListItemIcon
          className="sb-icon"
          sx={{ minWidth: 0, mr: "8px", color: "inherit", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s ease" }}
        >
          <i className={item.icon} style={{ fontSize: "1.375rem", lineHeight: 1 }} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{ primary: { sx: { fontSize: "0.875rem", fontWeight: active ? 600 : 400, letterSpacing: "0.01em", lineHeight: 1, color: "inherit" } } }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </Link>
  )
}

function SectionLabel({ heading, accent, first }: { heading: string; accent: string; first: boolean }) {
  return (
    <Typography
      sx={{
        fontSize: "0.6875rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: ra(accent),
        opacity: 0.6,
        px: "20px",
        mt: first ? 1 : 2.5,
        mb: 0.5,
        lineHeight: 1,
      }}
    >
      {heading}
    </Typography>
  )
}

export default function Sidebar({ rol }: { rol: Rol; nombre?: string; empresa?: string }) {
  const pathname = usePathname()
  const homeHref = homeHrefForRole(rol)

  return (
    <Box
      component="aside"
      sx={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: EW,
        flexShrink: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        borderRight: "2px solid #1E293B",
        overflow: "hidden",
        zIndex: 20,
      }}
    >
      {/* ═══════════ Logo ═══════════ */}
      <Box
        sx={{
          flexShrink: 0,
          height: 76,
          display: "flex",
          alignItems: "center",
          px: "16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href={homeHref} style={{ display: "block", textDecoration: "none", width: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo_desarrolla_cropped.png"
            alt="Desarrolla360"
            style={{ width: "100%", height: "auto", maxHeight: "48px", display: "block", objectFit: "contain", objectPosition: "left center" }}
          />
        </Link>
      </Box>

      {/* ═══════════ Navigation ═══════════ */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          py: 1,
          "&::-webkit-scrollbar":       { width: 3 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "var(--mui-palette-action-selected)", borderRadius: 2 },
        }}
      >
        {rol === "SUPERADMIN" ? (
          navSuperAdminSections.map((section, si) => (
            <Box key={section.heading}>
              <SectionLabel heading={section.heading} accent={section.accent} first={si === 0} />
              <List disablePadding>
                {section.items.map((item) => (
                  <NavItemRow key={item.href} item={item} pathname={pathname} accentColor={section.accent} />
                ))}
              </List>
            </Box>
          ))
        ) : (
          <>
            <SectionLabel heading={rol === "RH" ? "Menú" : "Mi espacio"} accent={defaultNavAccent} first />
            <List disablePadding>
              {(rol === "RH" ? navRH : navEmpleado).map((item) => (
                <NavItemRow key={item.href} item={item} pathname={pathname} accentColor={defaultNavAccent} />
              ))}
            </List>
          </>
        )}
      </Box>

      {/* Decorative circles — passive, no interaction */}
      <Box aria-hidden sx={{ position: "absolute", bottom: 16, left: 0, right: 0, pointerEvents: "none", zIndex: 0 }}>
        <Box sx={{
          position: "absolute", bottom: 8, left: 12,
          width: 40, height: 40, borderRadius: "50%",
          bgcolor: "#8B5CF6", opacity: 0.10,
        }} />
        <Box sx={{
          position: "absolute", bottom: 0, left: 36,
          width: 28, height: 28, borderRadius: "50%",
          bgcolor: "#FBBF24", opacity: 0.12,
        }} />
        <Box sx={{
          position: "absolute", bottom: 20, left: 56,
          width: 20, height: 20, borderRadius: "50%",
          bgcolor: "#F472B6", opacity: 0.10,
        }} />
      </Box>
    </Box>
  )
}
