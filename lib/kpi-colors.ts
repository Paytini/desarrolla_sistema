import { fd } from "@/lib/theme-tokens"

export type KpiColorKey =
  "primary" | "emerald" | "amber" | "orange" | "violet" | "pink" | "rose" | "charcoal"

export const kpiColorMap: Record<KpiColorKey, { bg: string; text: string }> = {
  primary: { bg: "#3B82F6", text: fd.foreground },
  emerald: { bg: "#10B981", text: fd.foreground },
  amber: { bg: "#F59E0B", text: fd.foreground },
  orange: { bg: "#F97316", text: fd.foreground },
  violet: { bg: "#7C3AED", text: "#FFFFFF" },
  pink: { bg: "#F472B6", text: fd.foreground },
  rose: { bg: "#EF4444", text: fd.foreground },
  charcoal: { bg: fd.foreground, text: "#FFFFFF" },
}
