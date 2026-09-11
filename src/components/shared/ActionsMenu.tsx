"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import type { SxProps, Theme } from "@mui/material/styles"
import { MoreVertical } from "lucide-react"
import ActionsPopover from "@/components/shared/ActionsPopover"
import { amber, emerald, gray } from "@/lib/theme-tokens"

type ActionsMenuTone = "neutral" | "amber" | "emerald" | "rose"

type ActionsMenuProps = {
  ariaLabel: string
  paperSx?: SxProps<Theme>
  children: (props: { close: () => void }) => ReactNode
}

export default function ActionsMenu({ ariaLabel, paperSx, children }: ActionsMenuProps) {
  return (
    <ActionsPopover
      transitionTimeout={140}
      paperSx={{ mt: 0.5, width: 208, py: 0.5, ...paperSx }}
      trigger={({ open, toggle, setAnchorEl }) => (
        <Box
          ref={setAnchorEl}
          component="button"
          type="button"
          onClick={toggle}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={ariaLabel}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            flexShrink: 0,
            border: "none",
            background: "none",
            borderRadius: "10px",
            color: "text.secondary",
            cursor: "pointer",
            transition: "background 0.15s ease",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <MoreVertical size={18} strokeWidth={2} />
        </Box>
      )}
    >
      {children}
    </ActionsPopover>
  )
}

const TONE_COLOR: Record<ActionsMenuTone, string> = {
  neutral: gray[700],
  amber: amber[800],
  emerald: emerald[800],
  rose: "#BE123C",
}

const TONE_HOVER: Record<ActionsMenuTone, string> = {
  neutral: "rgba(55,65,81,0.06)",
  amber: "rgba(245,158,11,0.08)",
  emerald: "rgba(16,185,129,0.08)",
  rose: "rgba(225,29,72,0.08)",
}

type ActionsMenuItemProps = {
  icon: ReactNode
  label: string
  tone?: ActionsMenuTone
  onClick?: () => void
  href?: string
  external?: boolean
}

export function ActionsMenuItem({
  icon,
  label,
  tone = "neutral",
  onClick,
  href,
  external,
}: ActionsMenuItemProps) {
  const sx: SxProps<Theme> = {
    display: "flex",
    alignItems: "center",
    gap: 1.25,
    width: "100%",
    px: 2,
    py: 1.25,
    cursor: "pointer",
    textAlign: "left",
    color: TONE_COLOR[tone],
    fontSize: "0.8125rem",
    fontWeight: 500,
    fontFamily: "inherit",
    transition: "background 0.15s ease",
    "&:hover": { bgcolor: TONE_HOVER[tone] },
  }

  if (href) {
    if (external) {
      return (
        <Box
          component="a"
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={onClick}
          sx={{ ...sx, textDecoration: "none" }}
        >
          {icon}
          {label}
        </Box>
      )
    }

    return (
      <Box component={Link} href={href} onClick={onClick} sx={{ ...sx, textDecoration: "none" }}>
        {icon}
        {label}
      </Box>
    )
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{ ...sx, border: "none", background: "none" }}
    >
      {icon}
      {label}
    </Box>
  )
}

export function ActionsMenuDivider() {
  return <Box sx={{ my: 0.5, borderTop: "1px solid", borderColor: "divider" }} />
}
