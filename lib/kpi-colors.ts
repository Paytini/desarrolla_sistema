import { fd } from "@/lib/theme-tokens"

export type KpiColorKey =
  | "primary" | "emerald" | "amber" | "orange" | "violet" | "pink" | "rose" | "charcoal"

export const kpiColorMap: Record<KpiColorKey, { bg: string; text: string }> = {
  primary:  { bg: '#3B82F6', text: '#FFFFFF' },
  emerald:  { bg: '#10B981', text: fd.foreground },
  amber:    { bg: '#F59E0B', text: fd.foreground },
  orange:   { bg: '#F97316', text: '#FFFFFF' },
  violet:   { bg: '#8B5CF6', text: '#FFFFFF' },
  pink:     { bg: '#F472B6', text: '#FFFFFF' },
  rose:     { bg: '#EF4444', text: '#FFFFFF' },
  charcoal: { bg: fd.foreground, text: '#FFFFFF' },
}
