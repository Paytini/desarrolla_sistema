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
  navEmpleado,
  navRH,
  navSuperAdminSections,
  roleLabel,
  type NavItem,
  type Rol,
} from "@/components/layout/nav-config"

const ACCENT_MAP: Record<string, string> = {
  "var(--brand)":            "#F5853F",
  "var(--sidebar-accent-2)": "#2DD4BF",
  "var(--sidebar-accent-3)": "#A78BFA",
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
  const Icon   = item.icon
  const c      = resolveAccent(accentColor)

  return (
    <Link
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
          py: 0.875,
          minHeight: 40,
          color: active ? "text.primary" : "text.secondary",
          gap: 1,
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
          transition: "background-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <ListItemIcon
          className="nav-icon"
          sx={{ minWidth: 0, color: active ? c : "inherit", transition: "color 0.15s ease", flexShrink: 0 }}
        >
          <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: {
              sx: { fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: "-0.01em", lineHeight: 1 },
            },
          }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </Link>
  )
}

export function MobileNav({
  rol,
  nombre,
  empresa,
}: {
  rol: Rol
  nombre: string
  empresa?: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const initials = getInitials(nombre)
  const homeHref = homeHrefForRole(rol)

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
        <Menu size={18} strokeWidth={2} />
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
        {/* Logo */}
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
          <Link href={homeHref} style={{ display: "flex", alignItems: "center", textDecoration: "none" }} onClick={() => setOpen(false)}>
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={1554}
              height={461}
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
          </Link>
        </Box>

        {/* Empresa chip */}
        {empresa && rol !== "SUPERADMIN" && (
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
            <Typography variant="overline" sx={{ display: "block", color: "primary.main", lineHeight: 1, mb: 0.5 }}>
              Empresa
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {empresa}
            </Typography>
          </Box>
        )}

        {/* Nav */}
        <Box sx={{ flex: 1, overflowY: "auto", py: 1.5 }}>
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
                  <Typography variant="overline" sx={{ color: resolveAccent(section.accent), lineHeight: 1 }}>
                    {section.heading}
                  </Typography>
                </Box>
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
              {(rol === "RH" ? navRH : navEmpleado).map((item) => (
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

        {/* Footer */}
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
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { bgcolor: "action.hover", color: "text.primary" },
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <LogOut size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span>Cerrar sesión</span>
          </Box>
        </Box>
        <Divider />
        <Box sx={{ flexShrink: 0, px: 1.5, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 11, background: "linear-gradient(135deg,#F5853F,#A78BFA)", color: "#fff", flexShrink: 0 }}>
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nombre}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
              {roleLabel[rol]}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
