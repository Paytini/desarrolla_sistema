import type { BadgeVariant } from "@/components/shared/StatusBadge"

export const CONSULTING_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: "amber",
  CONFIRMED: "green",
  CANCELLED: "red",
}

export const CONSULTING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
}
