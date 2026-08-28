import {
  Archive,
  ArchiveRestore,
  Award,
  Bell,
  Building2,
  Clock,
  Package,
  RefreshCwOff,
  ShieldAlert,
} from "lucide-react"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { alpha } from "@mui/material/styles"

export type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  archived: boolean
  created_at: string
}

const TYPE_ICON: Record<string, typeof Building2> = {
  EMPRESA_CREADA: Building2,
  EMPRESA_SUSPENDIDA: ShieldAlert,
  EMPRESA_REACTIVADA: Building2,
  PAQUETE_ASIGNADO: Package,
  PAQUETE_POR_VENCER: Clock,
  CONSTANCIA_LISTA: Award,
  SYNC_FALLIDO: RefreshCwOff,
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

export function NotificationRow({
  item,
  onToggleArchive,
}: {
  item: NotificationItem
  onToggleArchive?: (item: NotificationItem) => void
}) {
  const Icon = TYPE_ICON[item.type] ?? Bell
  const ArchiveIcon = item.archived ? ArchiveRestore : Archive

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        px: 2.5,
        py: 1.5,
        bgcolor: item.read ? "transparent" : (theme) => alpha(theme.palette.primary.main, 0.05),
        transition: "background-color 0.15s ease",
        "&:hover": { bgcolor: (theme) => alpha(theme.palette.primary.main, item.read ? 0.03 : 0.08) },
        "&:hover .notification-archive-action": { opacity: 1 },
      }}
    >
      {!item.read && (
        <Box
          sx={{
            position: "absolute",
            left: 8,
            top: 24,
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "primary.main",
          }}
        />
      )}
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "10px",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} strokeWidth={2} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: "0.8125rem",
            fontWeight: item.read ? 500 : 700,
            color: "text.primary",
          }}
        >
          {item.title}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            lineHeight: 1.4,
            mt: "1px",
          }}
        >
          {item.message}
        </Typography>
        <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled", mt: 0.5 }}>
          {timeAgo(item.created_at)}
        </Typography>
      </Box>

      {onToggleArchive && (
        <Box
          component="button"
          type="button"
          className="notification-archive-action"
          onClick={() => onToggleArchive(item)}
          aria-label={item.archived ? "Restaurar notificación" : "Archivar notificación"}
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            mt: 0.25,
            border: "none",
            background: "none",
            borderRadius: "6px",
            cursor: "pointer",
            color: "text.disabled",
            opacity: { xs: 1, sm: 0 },
            transition: "opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease",
            "&:hover": { bgcolor: "action.hover", color: "text.secondary" },
          }}
        >
          <ArchiveIcon size={14} strokeWidth={2} />
        </Box>
      )}
    </Box>
  )
}
