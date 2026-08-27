"use client"

import { signOut } from "next-auth/react"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import ActionsPopover from "@/components/shared/ActionsPopover"

import { avatarColor, getInitials, roleLabel, type Role } from "@/components/layout/nav-config"

interface TopbarUserMenuProps {
  name: string
  role: Role
  dark?: boolean
}

export function TopbarUserMenu({ name, role, dark = false }: TopbarUserMenuProps) {
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
          onClick={toggle}
          aria-haspopup="true"
          aria-expanded={open}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderRadius: "10px",
            px: 1,
            py: 0.75,
            width: "100%",
            transition: "background 0.15s ease",
            "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.08)" : "action.hover" },
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: color,
              fontSize: "0.8125rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ display: { xs: "none", lg: "block" }, textAlign: "left" }}>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: dark ? "var(--sidebar-navy-text-strong)" : "text.primary",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: dark ? "var(--sidebar-navy-text)" : "text.secondary",
                lineHeight: 1,
                mt: "2px",
              }}
            >
              {roleLabel[role]}
            </Typography>
          </Box>
          <Box
            component="i"
            className="ri-arrow-down-s-line"
            sx={{
              display: { xs: "none", lg: "block" },
              fontSize: "1rem",
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
            <Box sx={{ textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.3,
                }}
              >
                {name}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: "2px" }}>
                {roleLabel[role]}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box
            component="button"
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
