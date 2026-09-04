"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck, PartyPopper } from "lucide-react"

import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import ActionsPopover from "@/components/shared/ActionsPopover"
import { NotificationRow, type NotificationItem } from "@/components/notifications/NotificationRow"
import { groupNotificationsByDate } from "@/lib/notification-groups"
import { fd, gray } from "@/lib/theme-tokens"

const DROPDOWN_LIMIT = 8

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    fetch(`/api/internal/notifications?limit=${DROPDOWN_LIMIT}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setItems(data.items)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [])

  function handleMarkAllRead() {
    if (unreadCount === 0 || marking) return
    setMarking(true)
    setUnreadCount(0)
    setItems((prev) => prev.map((item) => ({ ...item, read: true })))
    fetch("/api/internal/notifications", { method: "PATCH" })
      .catch(() => {})
      .finally(() => setMarking(false))
  }

  function handleArchive(item: NotificationItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    if (!item.read) setUnreadCount((prev) => Math.max(0, prev - 1))
    fetch(`/api/internal/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    }).catch(() => {})
  }

  const groups = groupNotificationsByDate(items)

  return (
    <ActionsPopover
      transitionTimeout={160}
      paperSx={{ width: 440, maxHeight: 480, display: "flex", flexDirection: "column" }}
      trigger={({ open, toggle, setAnchorEl }) => (
        <Box
          ref={setAnchorEl}
          component="button"
          type="button"
          onClick={() => toggle()}
          aria-label="Notificaciones"
          aria-haspopup="true"
          aria-expanded={open}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            bgcolor: dark ? "rgba(255,255,255,0.1)" : fd.background,
            boxShadow: dark ? "none" : "0 1px 3px rgba(15,23,42,0.1)",
            color: dark ? "var(--sidebar-navy-text)" : "text.secondary",
            transition: "background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
            "&:hover": dark
              ? { bgcolor: "rgba(255,255,255,0.18)", color: "var(--sidebar-navy-text-strong)" }
              : {
                  bgcolor: fd.background,
                  boxShadow: "0 2px 8px rgba(15,23,42,0.16)",
                  color: "text.primary",
                },
          }}
        >
          <Bell size={20} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                minWidth: 15,
                height: 15,
                px: "3px",
                borderRadius: "8px",
                bgcolor: "primary.main",
                color: fd.background,
                fontSize: "9px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: dark ? "2px solid var(--sidebar-navy)" : `2px solid ${fd.background}`,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Box>
          )}
        </Box>
      )}
    >
      {({ close }) => (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              px: 2.5,
              py: 1.75,
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "text.primary" }}>
              Notificaciones
            </Typography>
            {unreadCount > 0 && (
              <Box
                component="button"
                type="button"
                onClick={handleMarkAllRead}
                disabled={marking}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  border: "none",
                  background: "none",
                  cursor: marking ? "default" : "pointer",
                  color: "primary.main",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  opacity: marking ? 0.6 : 1,
                  "&:hover": { textDecoration: marking ? "none" : "underline" },
                }}
              >
                <CheckCheck size={13} strokeWidth={2} />
                Marcar todo como leído
              </Box>
            )}
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
            {items.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.25,
                  px: 2.5,
                  py: 6,
                  textAlign: "center",
                }}
              >
                <PartyPopper size={28} strokeWidth={1.5} color={gray[400]} />
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "text.primary" }}>
                  Estás al día
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                  No tienes notificaciones nuevas.
                </Typography>
              </Box>
            ) : (
              groups.map((group) => (
                <Box key={group.label}>
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "text.disabled",
                      px: 2.5,
                      pt: 1.5,
                      pb: 0.5,
                    }}
                  >
                    {group.label}
                  </Typography>
                  {group.items.map((item) => (
                    <NotificationRow key={item.id} item={item} onToggleArchive={handleArchive} />
                  ))}
                </Box>
              ))
            )}
          </Box>

          <Divider />
          <Box sx={{ flexShrink: 0, px: 1, py: 1 }}>
            <Link href="/notifications" onClick={close} style={{ textDecoration: "none" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  py: 1,
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "primary.main",
                  transition: "background-color 0.15s ease",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                Ver todas las notificaciones
              </Box>
            </Link>
          </Box>
        </>
      )}
    </ActionsPopover>
  )
}
