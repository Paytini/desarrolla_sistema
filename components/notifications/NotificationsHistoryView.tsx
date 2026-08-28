"use client"

import { useCallback, useState } from "react"
import { Archive, CheckCheck, Loader2, PartyPopper } from "lucide-react"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

import { NotificationRow, type NotificationItem } from "@/components/notifications/NotificationRow"
import { groupNotificationsByDate } from "@/lib/notification-groups"

type Filter = "all" | "unread" | "archived"

const PAGE_SIZE = 20

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "No leídas" },
  { key: "archived", label: "Archivadas" },
]

export function NotificationsHistoryView({
  initialItems,
  initialNextCursor,
  initialUnreadCount,
}: {
  initialItems: NotificationItem[]
  initialNextCursor: string | null
  initialUnreadCount: number
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const [items, setItems] = useState(initialItems)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [marking, setMarking] = useState(false)

  const fetchPage = useCallback(async (nextFilter: Filter, cursor?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
    if (nextFilter === "unread") params.set("unreadOnly", "true")
    if (nextFilter === "archived") params.set("archived", "true")
    if (cursor) params.set("cursor", cursor)

    const res = await fetch(`/api/internal/notifications?${params.toString()}`)
    if (!res.ok) return null
    return res.json() as Promise<{
      items: NotificationItem[]
      nextCursor: string | null
      unreadCount: number
    }>
  }, [])

  async function handleFilterChange(next: Filter) {
    if (next === filter) return
    setFilter(next)
    setLoading(true)
    const data = await fetchPage(next)
    setLoading(false)
    if (!data) return
    setItems(data.items)
    setNextCursor(data.nextCursor)
    setUnreadCount(data.unreadCount)
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const data = await fetchPage(filter, nextCursor)
    setLoadingMore(false)
    if (!data) return
    setItems((prev) => [...prev, ...data.items])
    setNextCursor(data.nextCursor)
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || marking) return
    setMarking(true)
    setUnreadCount(0)
    if (filter === "unread") {
      setItems([])
      setNextCursor(null)
    } else {
      setItems((prev) => prev.map((item) => ({ ...item, read: true })))
    }
    await fetch("/api/internal/notifications", { method: "PATCH" }).catch(() => {})
    setMarking(false)
  }

  function handleToggleArchive(item: NotificationItem) {
    const nextArchived = !item.archived
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    if (!item.read && nextArchived) setUnreadCount((prev) => Math.max(0, prev - 1))
    fetch(`/api/internal/notifications/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: nextArchived }),
    }).catch(() => {})
  }

  const groups = groupNotificationsByDate(items)
  const emptyCopy: Record<Filter, { title: string; subtitle: string }> = {
    all: { title: "Estás al día", subtitle: "Aquí aparecerá el historial de tus notificaciones." },
    unread: {
      title: "No tienes notificaciones sin leer",
      subtitle: "Todo lo que has recibido ya está marcado como leído.",
    },
    archived: {
      title: "No tienes notificaciones archivadas",
      subtitle: "Las notificaciones que archives aparecerán aquí.",
    },
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: "1.375rem", fontWeight: 700, color: "text.primary" }}>
            Notificaciones
          </Typography>
        </Box>

        {unreadCount > 0 && (
          <Box
            component="button"
            type="button"
            onClick={handleMarkAllRead}
            disabled={marking}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              height: 40,
              px: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
              bgcolor: "background.paper",
              cursor: marking ? "default" : "pointer",
              color: "primary.main",
              fontSize: "0.8125rem",
              fontWeight: 600,
              fontFamily: "inherit",
              opacity: marking ? 0.6 : 1,
              transition: "background-color 0.15s ease",
              "&:hover": { bgcolor: marking ? "background.paper" : "action.hover" },
            }}
          >
            <CheckCheck size={15} strokeWidth={2} />
            Marcar todo como leído
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
        {TABS.map((tab) => (
          <Box
            key={tab.key}
            component="button"
            type="button"
            onClick={() => handleFilterChange(tab.key)}
            sx={{
              height: 36,
              px: 2,
              border: "1px solid",
              borderColor: filter === tab.key ? "primary.main" : "divider",
              borderRadius: "999px",
              bgcolor: filter === tab.key ? "primary.main" : "background.paper",
              color: filter === tab.key ? "#ffffff" : "text.secondary",
              fontSize: "0.8125rem",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
            }}
          >
            {tab.label}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "12px",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <Loader2 size={22} style={{ animation: "spin 0.8s linear infinite", color: "#9CA3AF" }} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.25,
              px: 3,
              py: 8,
              textAlign: "center",
            }}
          >
            {filter === "archived" ? (
              <Archive size={32} strokeWidth={1.5} color="#9CA3AF" />
            ) : (
              <PartyPopper size={32} strokeWidth={1.5} color="#9CA3AF" />
            )}
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
              {emptyCopy[filter].title}
            </Typography>
            <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              {emptyCopy[filter].subtitle}
            </Typography>
          </Box>
        ) : (
          groups.map((group, gi) => (
            <Box key={group.label}>
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "text.disabled",
                  px: 2.5,
                  pt: gi === 0 ? 1.75 : 2,
                  pb: 0.75,
                  borderTop: gi > 0 ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                {group.label}
              </Typography>
              {group.items.map((item, ii) => (
                <Box
                  key={item.id}
                  sx={{
                    borderTop: ii > 0 ? "1px solid" : "none",
                    borderColor: "divider",
                  }}
                >
                  <NotificationRow item={item} onToggleArchive={handleToggleArchive} />
                </Box>
              ))}
            </Box>
          ))
        )}
      </Box>

      {nextCursor && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2.5 }}>
          <Box
            component="button"
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              height: 40,
              px: 2.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
              bgcolor: "background.paper",
              cursor: loadingMore ? "default" : "pointer",
              color: "text.secondary",
              fontSize: "0.8125rem",
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "background-color 0.15s ease",
              "&:hover": { bgcolor: loadingMore ? "background.paper" : "action.hover" },
            }}
          >
            {loadingMore && (
              <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
            )}
            Cargar más
          </Box>
        </Box>
      )}
    </Box>
  )
}
