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
  homeHrefForRole,
  isActive,
  navEmpleado,
  navRH,
  navSuperAdminSections,
  type NavItem,
  type Rol,
} from "@/components/layout/nav-config"

const EW = 260

function NavItemRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname, item.exact)

  return (
    <Link href={item.href} prefetch style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <ListItemButton
        selected={active}
        sx={{
          borderRadius: '8px',
          mx: 1,
          mb: 0.5,
          pl: "12px",
          pr: "12px",
          py: "10px",
          minHeight: 44,
          color: "#6B7280",
          transition: "background-color 200ms, color 200ms",
          "&.Mui-selected": {
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            "& .sb-icon": { color: '#FFFFFF' },
            "&:hover": { backgroundColor: '#2563EB' },
          },
          "&:hover:not(.Mui-selected)": {
            backgroundColor: '#E5E7EB',
            color: '#111827',
            "& .sb-icon": { color: '#111827' },
          },
        }}
      >
        <ListItemIcon
          className="sb-icon"
          sx={{ minWidth: 0, mr: "8px", color: "inherit", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "color 200ms" }}
        >
          <i className={item.icon.replace(/-line$/, "-fill")} style={{ fontSize: "1.375rem", lineHeight: 1 }} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{ primary: { sx: { fontSize: "0.875rem", fontWeight: active ? 700 : 600, letterSpacing: "0.01em", lineHeight: 1, color: "inherit" } } }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </Link>
  )
}

function SectionLabel({ heading, first }: { heading: string; first: boolean }) {
  return (
    <Typography
      sx={{
        fontSize: "0.6875rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#9CA3AF",
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

export default function Sidebar({ rol }: { rol: Rol }) {
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
        backgroundColor: "#F3F4F6",
        overflow: "hidden",
        zIndex: 20,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          px: "16px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <Link href={homeHref} style={{ display: "block", textDecoration: "none", width: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo_desarrolla_cropped.png"
            alt="Desarrolla360"
            style={{ width: "100%", height: "auto", maxHeight: "40px", display: "block", objectFit: "contain", objectPosition: "left center" }}
          />
        </Link>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          py: 1,
          "&::-webkit-scrollbar":       { width: 3 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#D1D5DB", borderRadius: 2 },
        }}
      >
        {rol === "SUPERADMIN" ? (
          navSuperAdminSections.map((section, si) => (
            <Box key={section.heading}>
              <SectionLabel heading={section.heading} first={si === 0} />
              <List disablePadding>
                {section.items.map((item) => (
                  <NavItemRow key={item.href} item={item} pathname={pathname} />
                ))}
              </List>
            </Box>
          ))
        ) : (
          <>
            <SectionLabel heading={rol === "RH" ? "Menú" : "Mi espacio"} first />
            <List disablePadding>
              {(rol === "RH" ? navRH : navEmpleado).map((item) => (
                <NavItemRow key={item.href} item={item} pathname={pathname} />
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  )
}
