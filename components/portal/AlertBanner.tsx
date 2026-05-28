import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react"

type AlertTone = "green" | "amber" | "blue" | "red"

type AlertBannerProps = {
  tone: AlertTone
  title: string
  description?: string
}

const toneConfig: Record<AlertTone, { bg: string; border: string; icon: LucideIcon; iconColor: string }> = {
  green: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: CheckCircle2,
    iconColor: "#16a34a",
  },
  amber: {
    bg: "#fefce8",
    border: "#fde68a",
    icon: AlertTriangle,
    iconColor: "#d97706",
  },
  blue: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: Info,
    iconColor: "#2563eb",
  },
  red: {
    bg: "#fef2f2",
    border: "#fecaca",
    icon: AlertTriangle,
    iconColor: "#dc2626",
  },
}

export default function AlertBanner({ tone, title, description }: AlertBannerProps) {
  const { bg, border, icon: Icon, iconColor } = toneConfig[tone]
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3.5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon size={18} strokeWidth={2} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="text-[13.5px] font-semibold text-[#1a1a1a]">{title}</p>
        {description && (
          <p className="mt-0.5 text-[12.5px] text-[#475569]">{description}</p>
        )}
      </div>
    </div>
  )
}
