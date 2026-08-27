"use client"

import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CalendarClock, LifeBuoy } from "lucide-react"

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
  navHr,
  navSuperAdminSections,
  type NavItem,
  type Role,
} from "@/components/layout/nav-config"
import { FullscreenToggle } from "@/components/layout/FullscreenToggle"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { PortalGreeting } from "@/components/layout/PortalGreeting"
import { TopbarUserMenu } from "@/components/layout/TopbarUserMenu"
import EmployeeSearchBar from "@/components/search/EmployeeSearchBar"
import HrSearchBar from "@/components/search/HrSearchBar"
import SuperadminSearchBar from "@/components/search/SuperadminSearchBar"
import { blobProxyUrl } from "@/lib/blob-proxy"
import { companyPath } from "@/lib/company-routes"

const SIDEBAR_W = 288

const SIDEBAR_FONT =
  'var(--font-plus-jakarta-sans, "Plus Jakarta Sans"), system-ui, "Segoe UI", Arial, sans-serif'

function NavItemRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item.href, pathname, item.exact)
  const Icon = item.icon

  const LinkComponent = item.external ? "a" : Link
  const linkProps = item.external ? {} : { prefetch: true }

  return (
    <LinkComponent
      href={item.href}
      {...linkProps}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
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
          sx={{
            minWidth: 0,
            mr: 0.5,
            color: "inherit",
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
    </LinkComponent>
  )
}

export default function Sidebar({
  role,
  companySlug,
  companyName,
  companyLogoUrl,
  userName,
  userEmail,
}: {
  role: Role
  companySlug?: string
  companyName?: string
  companyLogoUrl?: string | null
  userName: string
  userEmail: string
}) {
  const pathname = usePathname()
  const homeHref = homeHrefForRole(role, companySlug)

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
        overflow: "hidden",
        zIndex: 20,
        fontFamily: SIDEBAR_FONT,
        bgcolor: "var(--sidebar-navy)",
        borderRight: "1px solid var(--sidebar-navy-border)",
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
          }}
        >
          {(role === "HR" || role === "EMPLOYEE") && companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- private blob URL, served through the authenticated proxy
            <img
              src={blobProxyUrl(companyLogoUrl)}
              alt={companyName ?? "Logo de la empresa"}
              style={{ height: 28, width: "auto", maxWidth: 160, objectFit: "contain" }}
            />
          ) : (
            <Image
              src="/assets/logo_desarrolla_cropped.png"
              alt="Desarrolla360"
              width={1554}
              height={461}
              style={{ height: 28, width: "auto", objectFit: "contain" }}
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
        <PortalGreeting name={userName} role={role} />
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1.5 }}>
        {role === "SUPERADMIN" ? (
          navSuperAdminSections.map((section, si) => (
            <Box key={section.heading} sx={{ mt: si > 0 ? 0.5 : 0 }}>
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
              <List disablePadding>
                {section.items.map((item) => (
                  <NavItemRow key={item.href} item={item} pathname={pathname} />
                ))}
              </List>
            </Box>
          ))
        ) : (
          <List disablePadding>
            {(role === "HR" ? navHr(companySlug ?? "") : navEmployee).map((item) => (
              <NavItemRow key={item.href} item={item} pathname={pathname} />
            ))}
          </List>
        )}
      </Box>

      {role === "SUPERADMIN" && (
        <Box sx={{ px: 1.5, pb: 1.5, flexShrink: 0 }}>
          <Link href="/superadmin/integration" style={{ textDecoration: "none" }}>
            <Box
              sx={{
                borderRadius: "14px",
                bgcolor: "var(--sidebar-navy-card-bg)",
                px: 2,
                py: 1.75,
                transition: "transform 150ms ease",
                "&:hover": { transform: "scale(1.015)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <LifeBuoy size={15} strokeWidth={2} color="var(--portal-blue)" />
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "var(--portal-blue)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Soporte
                </Typography>
              </Box>
              <Typography
                sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#FFFFFF", mb: 0.5 }}
              >
                Centro de ayuda
              </Typography>
              <Typography
                sx={{ fontSize: "0.75rem", lineHeight: 1.5, color: "rgba(255,255,255,0.6)" }}
              >
                Guías de DC-3, integración WordPress y estado del sistema.
              </Typography>
            </Box>
          </Link>
        </Box>
      )}

      {role === "HR" && (
        <Box sx={{ px: 1.5, pb: 1.5, flexShrink: 0 }}>
          <Link
            href={companyPath(companySlug ?? "", "/consulting")}
            style={{ textDecoration: "none" }}
          >
            <Box
              sx={{
                borderRadius: "14px",
                bgcolor: "var(--sidebar-navy-card-bg)",
                px: 2,
                py: 1.75,
                transition: "transform 150ms ease",
                "&:hover": { transform: "scale(1.015)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <CalendarClock size={15} strokeWidth={2} color="var(--portal-blue)" />
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "var(--portal-blue)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Consultoría
                </Typography>
              </Box>
              <Typography
                sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#FFFFFF", mb: 0.5 }}
              >
                Agenda una sesión en vivo
              </Typography>
              <Typography
                sx={{ fontSize: "0.75rem", lineHeight: 1.5, color: "rgba(255,255,255,0.6)" }}
              >
                Habla con nuestro equipo de consultores sobre CTPAT, OEA, DC-3 y más.
              </Typography>
            </Box>
          </Link>
        </Box>
      )}

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

      <Box sx={{ px: 1, pb: 1.5, flexShrink: 0 }}>
        <TopbarUserMenu name={userName} role={role} dark />
      </Box>
    </Box>
  )
}
