import { Paper, Box, Typography } from "@mui/material"
import { RingChart } from "@/components/shared/RingChart"
import { pg } from "@/lib/theme-tokens"
import type { LucideIcon } from "lucide-react"

export type KpiBorderColor =
  | "violet" | "pink" | "amber" | "emerald" | "charcoal"
  | "blue" | "green" | "orange" | "rose" | "primary" | "destructive"

type KpiCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
  alert?: boolean
  ring?: number
}

const accentMap: Record<KpiBorderColor, { bg: string; text: string; lightBg: string }> = {
  violet:      { bg: '#8B5CF6', text: '#FFFFFF', lightBg: '#F5F3FF' },
  pink:        { bg: '#F472B6', text: '#FFFFFF', lightBg: '#FDF2F8' },
  amber:       { bg: '#FBBF24', text: pg.ink,    lightBg: '#FFFBEB' },
  emerald:     { bg: '#34D399', text: pg.ink,    lightBg: '#ECFDF5' },
  charcoal:    { bg: pg.ink,    text: '#FFFFFF', lightBg: '#F8FAFC' },
  blue:        { bg: '#3B82F6', text: '#FFFFFF', lightBg: '#EFF6FF' },
  green:       { bg: '#34D399', text: pg.ink,    lightBg: '#ECFDF5' },
  orange:      { bg: pg.orange, text: '#FFFFFF', lightBg: '#FFF7ED' },
  rose:        { bg: '#EF4444', text: '#FFFFFF', lightBg: '#FEF2F2' },
  primary:     { bg: '#8B5CF6', text: '#FFFFFF', lightBg: '#F5F3FF' },
  destructive: { bg: '#EF4444', text: '#FFFFFF', lightBg: '#FEF2F2' },
}

export default function KpiCard({ label, value, sub, icon: Icon, borderColor = "violet", alert = false, ring }: KpiCardProps) {
  const { bg, text } = accentMap[alert ? "destructive" : borderColor]

  const isLight      = text === pg.ink
  const textSecondary = isLight ? 'rgba(30,41,59,0.6)' : 'rgba(255,255,255,0.7)'
  const ringArc      = isLight ? 'rgba(30,41,59,0.75)' : 'rgba(255,255,255,0.92)'
  const ringTrack    = isLight ? 'rgba(30,41,59,0.15)' : 'rgba(255,255,255,0.22)'

  return (
    <Paper
      elevation={0}
      className="pg-hover-lift"
      sx={{
        borderRadius: '16px',
        border: `2px solid ${pg.ink}`,
        boxShadow: pg.shadow.md,
        backgroundColor: bg,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Box sx={{ mb: 2 }}>
          {ring !== undefined ? (
            <RingChart pct={ring} color={ringArc} trackColor={ringTrack} textColor={text} size={52} sw={5} />
          ) : Icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                color: text,
                border: `2px solid ${isLight ? 'rgba(30,41,59,0.25)' : 'rgba(255,255,255,0.35)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} strokeWidth={2.5} />
            </Box>
          ) : null}
        </Box>

        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.5,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
            fontSize: '2rem',
            fontWeight: 800,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
            color: text,
            mb: sub ? 0.5 : 0,
          }}
        >
          {value}
        </Typography>

        {sub && (
          <Typography sx={{ fontSize: '0.75rem', color: textSecondary }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
