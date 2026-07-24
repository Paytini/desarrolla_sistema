"use client"

import { useEffect, useState } from "react"
import { Bell, Building2, Package, ShieldAlert } from "lucide-react"

import Box from "@mui/material/Box"
import Fade from "@mui/material/Fade"
import Paper from "@mui/material/Paper"
import Popper from "@mui/material/Popper"
import Typography from "@mui/material/Typography"
import { alpha } from "@mui/material/styles"

type NotificationItem = {
  id: number
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, typeof Building2> = {
  EMPRESA_CREADA:      Building2,
  EMPRESA_SUSPENDIDA:  ShieldAlert,
  EMPRESA_REACTIVADA:  Building2,
  PAQUETE_ASIGNADO:    Package,
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch("/api/internal/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setItems(data.items)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [])

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0) {
      setUnreadCount(0)
      fetch("/api/internal/notifications", { method: "PATCH" }).catch(() => {})
    }
  }

  return (
    <>
      <Box
        ref={setAnchorEl}
        component="button"
        type="button"
        onClick={handleToggle}
        aria-label="Notificaciones"
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          border: "none",
          background: "none",
          borderRadius: "8px",
          cursor: "pointer",
          color: "text.secondary",
          transition: "background 0.15s ease, color 0.15s ease",
          "&:hover": { bgcolor: "action.hover", color: "text.primary" },
        }}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              minWidth: 15,
              height: 15,
              px: "3px",
              borderRadius: "8px",
              bgcolor: "primary.main",
              color: "#FFFFFF",
              fontSize: "9px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #FFFFFF",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Box>
        )}
      </Box>

      <Popper open={open} anchorEl={anchorEl} placement="bottom-end" transition disablePortal={false} style={{ zIndex: 1300 }}>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={160}>
            <Paper
              elevation={0}
              sx={{
                mt: 1,
                width: 340,
                maxHeight: 420,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,34,0.12), 0 2px 8px rgba(0,0,34,0.06)",
              }}
            >
              <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "text.primary" }}>
                  Notificaciones
                </Typography>
              </Box>

              {items.length === 0 ? (
                <Box sx={{ px: 2.5, py: 4, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                    No tienes notificaciones todavía.
                  </Typography>
                </Box>
              ) : (
                items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell
                  return (
                    <Box
                      key={n.id}
                      sx={{
                        display: "flex",
                        gap: 1.25,
                        px: 2.5,
                        py: 1.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: n.read ? "transparent" : (theme) => alpha(theme.palette.primary.main, 0.04),
                      }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "8px",
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          color: "primary.main",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={14} strokeWidth={2} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "text.primary" }}>
                          {n.title}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.4, mt: "1px" }}>
                          {n.message}
                        </Typography>
                        <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled", mt: 0.5 }}>
                          {timeAgo(n.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })
              )}
            </Paper>
          </Fade>
        )}
      </Popper>

      {open && (
        <Box onClick={() => setOpen(false)} sx={{ position: "fixed", inset: 0, zIndex: 1299 }} />
      )}
    </>
  )
}
