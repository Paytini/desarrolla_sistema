import StatusBadge, { type BadgeVariant } from "@/components/shared/StatusBadge"

type StatusLabelProps<T extends string> = {
  status: T
  variantMap: Partial<Record<T, BadgeVariant>>
  labelMap: Partial<Record<T, string>>
  fallbackVariant?: BadgeVariant
  dot?: boolean
}

export function StatusLabel<T extends string>({
  status,
  variantMap,
  labelMap,
  fallbackVariant = "slate",
  dot = true,
}: StatusLabelProps<T>) {
  return (
    <StatusBadge variant={variantMap[status] ?? fallbackVariant} dot={dot}>
      {labelMap[status] ?? status}
    </StatusBadge>
  )
}
