"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import ActionsPopover from "@/components/shared/ActionsPopover"

import { avatarColor, getInitials } from "@/components/layout/nav-config"

interface TopbarUserMenuProps {
  name: string
  companyName?: string
  dark?: boolean
}

export function TopbarUserMenu({ name, companyName, dark = false }: TopbarUserMenuProps) {
  const color = avatarColor(name)
  const initials = getInitials(name)

  return (
    <ActionsPopover
      transitionTimeout={160}
      paperSx={{ width: 240, borderRadius: 0 }}
      trigger={({ open, toggle, setAnchorEl }) => (
        <Box
          ref={setAnchorEl}
          component="button"
          type="button"
          onClick={toggle}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Menú de perfil"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            height: 44,
            pl: 0.5,
            pr: 1.5,
            border: "none",
            borderRadius: "999px",
            cursor: "pointer",
            bgcolor: dark ? "rgba(255,255,255,0.1)" : "#ffffff",
            boxShadow: dark ? "none" : "0 1px 3px rgba(15,23,42,0.1)",
            transition: "background-color 0.15s ease, box-shadow 0.15s ease",
            "&:hover": dark
              ? { bgcolor: "rgba(255,255,255,0.18)" }
              : { bgcolor: "#ffffff", boxShadow: "0 2px 8px rgba(15,23,42,0.16)" },
          }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: color,
              fontSize: "0.8125rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Typography
            sx={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: dark ? "var(--sidebar-navy-text-strong)" : "text.primary",
              lineHeight: 1,
              whiteSpace: "nowrap",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </Typography>
          <Box
            component="i"
            className="ri-arrow-down-s-line"
            sx={{
              fontSize: "1.0625rem",
              color: dark ? "var(--sidebar-navy-text)" : "text.secondary",
              lineHeight: 1,
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Box>
      )}
    >
      {() => (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              px: 3,
              pt: 3,
              pb: 2.5,
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: color,
                fontSize: "1.5rem",
                fontWeight: 700,
                boxShadow: `0 4px 14px ${color}55`,
              }}
            >
              {initials}
            </Avatar>
            <Typography
              sx={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "text.primary",
                lineHeight: 1.3,
                textAlign: "center",
              }}
            >
              {name}
            </Typography>
            {companyName && (
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: "-2px" }}>
                {companyName}
              </Typography>
            )}
          </Box>

          <Divider />

          <Link href="/notifications" style={{ textDecoration: "none", color: "inherit" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
                px: 3,
                py: 1.5,
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
                color: "text.primary",
                fontSize: "0.875rem",
                fontFamily: "inherit",
                fontWeight: 500,
                transition: "background 0.15s ease",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box
                component="i"
                className="ri-notification-3-line"
                sx={{ fontSize: "1.125rem", lineHeight: 1, color: "text.secondary" }}
              />
              Notificaciones
            </Box>
          </Link>

          <Divider />

          <Box
            component="button"
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              width: "100%",
              px: 3,
              py: 1.75,
              border: "none",
              background: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "error.main",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              fontWeight: 500,
              transition: "background 0.15s ease",
              "&:hover": { bgcolor: "rgba(239,68,68,0.05)" },
            }}
          >
            <Box
              component="i"
              className="ri-logout-box-r-line"
              sx={{ fontSize: "1.125rem", lineHeight: 1 }}
            />
            Cerrar sesión
          </Box>
        </>
      )}
    </ActionsPopover>
  )
}
