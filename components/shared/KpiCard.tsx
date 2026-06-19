import { Paper, Box, Typography } from "@mui/material"
import { RingChart } from "@/components/shared/RingChart"
import { pg } from "@/lib/theme-tokens"
import type { LucideIcon } from "lucide-react"

export type KpiBorderColor =
  | "orange" | "charcoal" | "amber" | "rose" | "blue" | "green"
  | "primary" | "destructive"

type KpiCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  borderColor?: KpiBorderColor
  alert?: boolean
  ring?: number
}

const accentMap: Record<KpiBorderColor, { bg: string; text: string }> = {
  orange:      { bg: pg.orange,  text: '#FFFFFF' },
  charcoal:    { bg: pg.ink,     text: '#FFFFFF' },
  amber:       { bg: pg.amber,   text: pg.ink    },
  rose:        { bg: '#EF4444', text: '#FFFFFF' },
  blue:        { bg: pg.violet,  text: '#FFFFFF' },
  green:       { bg: pg.emerald, text: pg.ink    },
  primary:     { bg: pg.orange,  text: '#FFFFFF' },
  destructive: { bg: '#EF4444', text: '#FFFFFF' },
}

export default function KpiCard({ label, value, sub, icon: Icon, borderColor = "orange", alert = false, ring }: KpiCardProps) {
  const { bg, text } = accentMap[alert ? "destructive" : borderColor]

  return (
    <Paper
      elevation={0}
      className="pg-hover-lift"
      sx={{
        borderRadius: '16px',
        border: `2px solid ${pg.ink}`,
        boxShadow: pg.shadow.md,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Box sx={{ mb: 2 }}>
          {ring !== undefined ? (
            <RingChart pct={ring} color={bg} size={52} sw={5} />
          ) : Icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: bg,
                color: text,
                border: `2px solid ${pg.ink}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0px 0px #1E293B',
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
            color: 'text.secondary',
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
            color: alert ? 'error.main' : 'text.primary',
            mb: sub ? 0.5 : 0,
          }}
        >
          {value}
        </Typography>

        {sub && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
