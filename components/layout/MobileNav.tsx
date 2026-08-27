"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogOut, Menu } from "lucide-react"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Typography from "@mui/material/Typography"

import {
  getInitials,
  homeHrefForRole,
  isActive,
  navEmployee,
  navHr,
  navSuperAdminSections,
  roleLabel,
  type NavItem,
  type Role,
} from "@/components/layout/nav-config"
import { FullscreenToggle } from "@/components/layout/FullscreenToggle"
import { NotificationBell } from "@/components/layout/NotificationBell"
import EmployeeSearchBar from "@/components/search/EmployeeSearchBar"
import HrSearchBar from "@/components/search/HrSearchBar"
import SuperadminSearchBar from "@/components/search/SuperadminSearchBar"
import { blobProxyUrl } from "@/lib/blob-proxy"

function MobileNavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem
  pathname: string
  onClose: () => void
}) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon

  const LinkComponent = item.external ? "a" : Link

  return (
    <LinkComponent
      href={item.href}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onClick={onClose}
    >
      <ListItemButton
        selected={active}
        sx={{
          borderRadius: "8px",
          mx: 1,
          mb: 0.25,
          px: 1.25,
          py: "9px",
          minHeight: 40,
          gap: 1,
          color: "var(--sidebar-navy-text)",
          "&.Mui-selected": {
            bgcolor: "var(--sidebar-navy-active-bg)",
            color: "var(--sidebar-navy-active-text)",
            "& .nav-icon": { color: "var(--sidebar-navy-active-text)" },
            "&:hover": { bgcolor: "var(--sidebar-navy-active-bg)" },
          },
          "&:hover:not(.Mui-selected)": {
            bgcolor: "var(--sidebar-navy-hover-bg)",
            color: "var(--sidebar-navy-text-strong)",
          },
          transition: "background-color 0.15s ease, color 0.15s ease",
        }}
      >
        <ListItemIcon
          className="nav-icon"
          sx={{ minWidth: 0, color: "inherit", transition: "color 0.15s ease", flexShrink: 0 }}
        >
          <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              sx: { fontSize: "0.875rem", fontWeight: active ? 700 : 600, lineHeight: 1 },
            },
          }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </LinkComponent>
  )
}

export function MobileNav({
  role,
  name,
  company,
  companySlug,
  companyLogoUrl,
}: {
  role: Role
  name: string
  company?: string
  companySlug?: string
  companyLogoUrl?: string | null
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)

  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  const initials = getInitials(name)
  const homeHref = homeHrefForRole(role, companySlug)

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        size="small"
        sx={{
          display: { md: "none" },
          color: "text.secondary",
          "&:hover": { bgcolor: "action.hover", color: "text.primary" },
        }}
      >
        <Menu size={18} strokeWidth={1.8} />
      </IconButton>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              bgcolor: "var(--sidebar-navy)",
              borderRight: "1px solid var(--sidebar-navy-border)",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box
          sx={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            px: 2,
            borderBottom: "1px solid var(--sidebar-navy-border)",
          }}
        >
          <Link
            href={homeHref}
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              background: "#FFFFFF",
              borderRadius: 8,
              padding: "6px 10px",
              width: "fit-content",
            }}
            onClick={() => setOpen(false)}
          >
            {(role === "HR" || role === "EMPLOYEE") && companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- private blob URL, served through the authenticated proxy
              <img
                src={blobProxyUrl(companyLogoUrl)}
                alt={company ?? "Logo de la empresa"}
                style={{ height: 26, width: "auto", maxWidth: 140, objectFit: "contain" }}
              />
            ) : (
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={88}
                height={26}
                style={{ height: 26, width: 88, objectFit: "contain" }}
              />
            )}
          </Link>
        </Box>

        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid var(--sidebar-navy-border)",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            flexShrink: 0,
          }}
        >
          {role === "SUPERADMIN" ? (
            <SuperadminSearchBar />
          ) : role === "HR" ? (
            companySlug && <HrSearchBar companySlug={companySlug} />
          ) : (
            <EmployeeSearchBar />
          )}
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", py: 1.5 }}>
          {role === "SUPERADMIN" ? (
            navSuperAdminSections.map((section, si) => (
              <Box key={section.heading} sx={{ mt: si > 0 ? 0.5 : 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--sidebar-navy-text)",
                    opacity: 0.7,
                    px: "20px",
                    mt: si > 0 ? 2 : 0.5,
                    mb: 0.5,
                    lineHeight: 1,
                  }}
                >
                  {section.heading}
                </Typography>
                <List disablePadding>
                  {section.items.map((item) => (
                    <MobileNavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </List>
              </Box>
            ))
          ) : (
            <List disablePadding>
              {(role === "HR" ? navHr(companySlug ?? "") : navEmployee).map((item) => (
                <MobileNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClose={() => setOpen(false)}
                />
              ))}
            </List>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            py: 1,
            borderTop: "1px solid var(--sidebar-navy-border)",
            flexShrink: 0,
          }}
        >
          <NotificationBell dark />
          <FullscreenToggle dark />
        </Box>

        <Box sx={{ flexShrink: 0, px: 1, pt: 1, pb: 0.5 }}>
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
              color: "var(--sidebar-navy-text)",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { bgcolor: "rgba(220,38,38,0.15)", color: "#FCA5A5" },
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span>Cerrar sesión</span>
          </Box>
        </Box>
        <Divider sx={{ borderColor: "var(--sidebar-navy-border)" }} />
        <Box
          sx={{ flexShrink: 0, px: 1.5, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 11,
              background: "linear-gradient(135deg,var(--portal-blue),#6B9EF8)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--sidebar-navy-text-strong)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "var(--sidebar-navy-text)" }}>
              {roleLabel[role]}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
