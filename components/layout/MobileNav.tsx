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
  defaultNavAccent,
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
import { blobProxyUrl } from "@/lib/blob-proxy"

const ACCENT_MAP: Record<string, string> = {
  "var(--brand)": "#3579F5",
  "var(--sidebar-accent-2)": "#3579F5",
  "var(--sidebar-accent-3)": "#3579F5",
}
const resolveAccent = (raw: string) => ACCENT_MAP[raw] ?? raw

function MobileNavLink({
  item,
  pathname,
  accentColor,
  onClose,
}: {
  item: NavItem
  pathname: string
  accentColor: string
  onClose: () => void
}) {
  const active = isActive(item.href, pathname, item.exact)
  const c = resolveAccent(accentColor)
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
          borderStartStartRadius: 0,
          borderEndStartRadius: 0,
          borderStartEndRadius: "9999px",
          borderEndEndRadius: "9999px",
          mx: 0,
          mb: 0.25,
          pl: "20px",
          pr: "16px",
          py: "9px",
          minHeight: 40,
          color: active ? "text.primary" : "text.secondary",
          gap: 1,
          "&.Mui-selected": {
            background: `linear-gradient(270deg, ${c}, color-mix(in srgb, ${c} 50%, white))`,
            color: "#fff",
            boxShadow: `3px 0px 0px 0px ${c} inset`,
            "& .nav-icon": { color: "#fff" },
            "&:hover": {
              background: `linear-gradient(270deg, ${c}, color-mix(in srgb, ${c} 50%, white))`,
            },
          },
          "&:hover:not(.Mui-selected)": {
            bgcolor: "action.hover",
            color: "text.primary",
            "& .nav-icon": { color: c },
          },
          transition: "background 0.15s ease",
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
              sx: {
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                color: "inherit",
              },
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
              width: 240,
              bgcolor: "background.paper",
              borderRight: "1px solid",
              borderColor: "divider",
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
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Link
            href={homeHref}
            style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
            onClick={() => setOpen(false)}
          >
            {(role === "HR" || role === "EMPLOYEE") && companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- private blob URL, served through the authenticated proxy
              <img
                src={blobProxyUrl(companyLogoUrl)}
                alt={company ?? "Logo de la empresa"}
                style={{ height: 32, width: "auto", maxWidth: 160, objectFit: "contain" }}
              />
            ) : (
              <Image
                src="/assets/logo_desarrolla_cropped.png"
                alt="Desarrolla360"
                width={1554}
                height={461}
                style={{ height: 32, width: "auto", objectFit: "contain" }}
              />
            )}
          </Link>
        </Box>

        {company && role !== "SUPERADMIN" && (
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
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {company}
            </Typography>
          </Box>
        )}

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
                    color: resolveAccent(section.accent),
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
                      accentColor={section.accent}
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
                  accentColor={defaultNavAccent}
                  onClose={() => setOpen(false)}
                />
              ))}
            </List>
          )}
        </Box>

        <Divider />
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
              color: "text.secondary",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { bgcolor: "rgba(220,38,38,0.06)", color: "error.main" },
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span>Cerrar sesión</span>
          </Box>
        </Box>
        <Divider />
        <Box
          sx={{ flexShrink: 0, px: 1.5, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 11,
              background: "linear-gradient(135deg,#3579F5,#6B9EF8)",
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
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>
              {roleLabel[role]}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
