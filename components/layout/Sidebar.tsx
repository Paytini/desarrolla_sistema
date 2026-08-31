"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { LifeBuoy, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import Box from "@mui/material/Box"
import List from "@mui/material/List"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"

import {
  avatarColor,
  getInitials,
  isActive,
  navEmployee,
  navHr,
  navSuperAdminSections,
  type NavItem,
  type Role,
} from "@/components/layout/nav-config"

const SIDEBAR_W = 288
const SIDEBAR_W_COLLAPSED = 88

const SIDEBAR_FONT =
  'var(--font-plus-jakarta-sans, "Plus Jakarta Sans"), system-ui, "Segoe UI", Arial, sans-serif'

function NavItemRow({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
}) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon

  const LinkComponent = item.external ? "a" : Link
  const linkProps = item.external ? {} : { prefetch: true }

  if (collapsed) {
    return (
      <Tooltip title={item.label} placement="right">
        <LinkComponent
          href={item.href}
          {...linkProps}
          style={{ textDecoration: "none", color: "inherit", display: "flex" }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              mx: "auto",
              mb: 0.5,
              borderRadius: "50%",
              color: active ? "var(--sidebar-navy-active-text)" : "var(--sidebar-navy-text)",
              bgcolor: active ? "var(--sidebar-navy-active-bg)" : "transparent",
              transition: "background-color 0.15s ease, color 0.15s ease",
              "&:hover": {
                bgcolor: active ? "var(--sidebar-navy-active-bg)" : "var(--sidebar-navy-hover-bg)",
                color: active ? "var(--sidebar-navy-active-text)" : "var(--sidebar-navy-text-strong)",
              },
            }}
          >
            <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
          </Box>
        </LinkComponent>
      </Tooltip>
    )
  }

  return (
    <LinkComponent
      href={item.href}
      {...linkProps}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Box
        className="nav-row"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1.25,
          py: 0.5,
          mb: 0.25,
          color: "var(--sidebar-navy-text)",
          transition: "color 0.15s ease",
          "&:hover": { color: "var(--sidebar-navy-text-strong)" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: "50%",
            color: active ? "var(--sidebar-navy-active-text)" : "inherit",
            bgcolor: active ? "var(--sidebar-navy-active-bg)" : "var(--sidebar-navy-hover-bg)",
            transition: "background-color 0.15s ease, color 0.15s ease",
          }}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </Box>
        <Typography
          sx={{
            fontFamily: SIDEBAR_FONT,
            fontSize: "0.875rem",
            fontWeight: active ? 700 : 600,
            letterSpacing: "0.01em",
            lineHeight: 1,
            color: active ? "var(--sidebar-navy-text-strong)" : "inherit",
          }}
        >
          {item.label}
        </Typography>
      </Box>
    </LinkComponent>
  )
}

export default function Sidebar({
  role,
  companySlug,
  logoSrc,
  logoAlt,
  companyName,
}: {
  role: Role
  companySlug?: string
  logoSrc?: string | null
  logoAlt?: string
  companyName?: string
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Box
      component="aside"
      sx={{
        height: "100%",
        width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
        flexShrink: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 20,
        fontFamily: SIDEBAR_FONT,
        bgcolor: "var(--sidebar-navy)",
        borderRight: "1px solid var(--sidebar-navy-border)",
        transition: "width 0.2s ease",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: 72,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          px: collapsed ? 1 : 2,
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary tenant logo, size unknown ahead of time
          <img
            src={logoSrc}
            alt={logoAlt ?? "Logo de la empresa"}
            style={{
              maxHeight: 48,
              maxWidth: "100%",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              opacity: 0.95,
            }}
          />
        ) : role === "SUPERADMIN" ? (
          <Image
            src="/assets/logo_desarrolla_cropped.webp"
            alt="Desarrolla360"
            width={220}
            height={66}
            priority
            style={{
              height: 52,
              width: "auto",
              objectFit: "contain",
              filter: "brightness(0) invert(1)",
              opacity: 0.95,
            }}
          />
        ) : (
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: avatarColor(companyName ?? "?"),
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 700,
            }}
          >
            {getInitials(companyName ?? "?")}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          pt: role === "SUPERADMIN" ? 1.5 : 5,
          pb: 1.5,
        }}
      >
        {role === "SUPERADMIN" ? (
          navSuperAdminSections.map((section, si) => (
            <Box key={section.heading} sx={{ mt: si > 0 ? 0.5 : 0 }}>
              {collapsed ? (
                si > 0 && (
                  <Box
                    sx={{
                      mx: 2,
                      my: 1,
                      height: "1px",
                      bgcolor: "var(--sidebar-navy-border)",
                    }}
                  />
                )
              ) : (
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    fontFamily: SIDEBAR_FONT,
                    color: "var(--sidebar-navy-text)",
                    opacity: 0.7,
                    px: 2.5,
                    mt: si > 0 ? 2 : 0.5,
                    mb: 0.75,
                    lineHeight: 1,
                  }}
                >
                  {section.heading}
                </Typography>
              )}
              <List disablePadding>
                {section.items.map((item) => (
                  <NavItemRow key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
                ))}
              </List>
            </Box>
          ))
        ) : (
          <List disablePadding>
            {(role === "HR" ? navHr(companySlug ?? "") : navEmployee).map((item) => (
              <NavItemRow key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
          </List>
        )}

        {role !== "SUPERADMIN" &&
          (collapsed ? (
            <Tooltip title="¿Necesitas ayuda?" placement="right">
              <Box
                component={Link}
                href="/support"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  mx: "auto",
                  mt: "auto",
                  borderRadius: "50%",
                  color: "var(--sidebar-navy-text)",
                  bgcolor: "var(--sidebar-navy-hover-bg)",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.16)",
                    color: "var(--sidebar-navy-text-strong)",
                  },
                }}
              >
                <LifeBuoy size={19} strokeWidth={1.8} />
              </Box>
            </Tooltip>
          ) : (
            <Box
              sx={{
                mt: "auto",
                mx: 1.5,
                p: 2,
                borderRadius: "14px",
                border: "1px solid var(--sidebar-navy-border)",
                bgcolor: "rgba(0,0,0,0.12)",
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.14)",
                  color: "var(--sidebar-navy-text-strong)",
                  mb: 1.25,
                }}
              >
                <LifeBuoy size={17} strokeWidth={1.8} />
              </Box>
              <Typography
                sx={{
                  fontFamily: SIDEBAR_FONT,
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--sidebar-navy-text-strong)",
                  lineHeight: 1.3,
                }}
              >
                ¿Necesitas ayuda?
              </Typography>
              <Typography
                sx={{
                  fontFamily: SIDEBAR_FONT,
                  fontSize: "0.75rem",
                  color: "var(--sidebar-navy-text-strong)",
                  lineHeight: 1.4,
                  mt: 0.375,
                  mb: 1.25,
                }}
              >
                Escríbenos y te ayudamos.
              </Typography>
              <Box
                component={Link}
                href="/support"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  minHeight: 44,
                  borderRadius: "8px",
                  textDecoration: "none",
                  bgcolor: "var(--sidebar-navy-active-bg)",
                  color: "var(--sidebar-navy-active-text)",
                  fontFamily: SIDEBAR_FONT,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  transition: "opacity 0.15s ease",
                  "&:hover": { opacity: 0.85 },
                }}
              >
                Contactar soporte
              </Box>
            </Box>
          ))}
      </Box>

      <Box sx={{ px: 1, py: 0.5, flexShrink: 0, borderTop: "1px solid var(--sidebar-navy-border)" }}>
        <Tooltip title={collapsed ? "Expandir" : ""} placement="right">
          <Box
            component="button"
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 1,
              width: "100%",
              px: collapsed ? 0 : 1.25,
              py: 0.625,
              border: "none",
              bgcolor: "transparent",
              borderRadius: "8px",
              cursor: "pointer",
              color: "var(--sidebar-navy-text)",
              fontFamily: "inherit",
              fontSize: "0.8125rem",
              fontWeight: 600,
              transition: "background-color 0.15s ease, color 0.15s ease",
              "&:hover": {
                bgcolor: "var(--sidebar-navy-hover-bg)",
                color: "var(--sidebar-navy-text-strong)",
              },
            }}
          >
            {collapsed ? <PanelLeftOpen size={19} strokeWidth={1.8} /> : <PanelLeftClose size={19} strokeWidth={1.8} />}
            {!collapsed && <span>Colapsar</span>}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  )
}
