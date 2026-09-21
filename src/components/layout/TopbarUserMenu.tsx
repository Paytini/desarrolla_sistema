"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { ChevronDown, KeyRound, LogOut } from "lucide-react"

import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import ActionsPopover from "@/components/shared/ActionsPopover"
import StatusBadge from "@/components/shared/StatusBadge"
import { fd } from "@/lib/theme-tokens"

import { avatarColor, getInitials } from "@/components/layout/nav-config"

type PortalRole = "SUPERADMIN" | "HR" | "EMPLOYEE"

interface TopbarUserMenuProps {
  name: string
  email: string
  role: PortalRole
  companyName?: string
  dark?: boolean
}

const ROLE_LABEL: Record<PortalRole, string> = {
  SUPERADMIN: "Superadmin",
  HR: "Recursos Humanos",
  EMPLOYEE: "Empleado",
}

export function TopbarUserMenu({
  name,
  email,
  role,
  companyName,
  dark = false,
}: TopbarUserMenuProps) {
  const color = avatarColor(name)
  const initials = getInitials(name)

  return (
    <ActionsPopover
      transitionTimeout={160}
      paperSx={{ width: 280 }}
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
            bgcolor: dark ? "rgba(255,255,255,0.1)" : fd.background,
            boxShadow: dark ? "none" : "0 1px 3px rgba(15,23,42,0.1)",
            transition: "background-color 0.15s ease, box-shadow 0.15s ease",
            "&:hover": dark
              ? { bgcolor: "rgba(255,255,255,0.18)" }
              : { bgcolor: fd.background, boxShadow: "0 2px 8px rgba(15,23,42,0.16)" },
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
            component={ChevronDown}
            size={17}
            strokeWidth={2.25}
            sx={{
              color: dark ? "var(--sidebar-navy-text)" : "text.secondary",
              transition: "transform 0.2s ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Box>
      )}
    >
      {() => (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, pt: 2.5, pb: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: color,
                fontSize: "1.0625rem",
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: `0 4px 14px ${color}55`,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, px: 2.5, pb: 2 }}>
            <StatusBadge variant="blue">{ROLE_LABEL[role]}</StatusBadge>
            {companyName && (
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {companyName}
              </Typography>
            )}
          </Box>

          <Divider />

          {role === "EMPLOYEE" && (
            <>
              <Link
                href="/employee/change-password"
                style={{ textDecoration: "none", color: "inherit" }}
              >
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
                  <Box component={KeyRound} size={17} sx={{ color: "text.secondary", flexShrink: 0 }} />
                  Cambiar contraseña
                </Box>
              </Link>

              <Divider />
            </>
          )}

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
            <Box component={LogOut} size={17} sx={{ flexShrink: 0 }} />
            Cerrar sesión
          </Box>
        </>
      )}
    </ActionsPopover>
  )
}
