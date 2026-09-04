import { Box, CircularProgress, Typography } from "@mui/material"
import { slate } from "@/lib/theme-tokens"

export function RingChart({
  pct,
  size = 56,
  sw = 6,
  color,
  trackColor = slate[200],
  textColor,
}: {
  pct: number
  size?: number
  sw?: number
  color: string
  trackColor?: string
  textColor?: string
}) {
  const value = Math.min(pct, 100)
  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={sw}
        sx={{ position: "absolute", color: trackColor }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={sw}
        sx={{ position: "absolute", color }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: textColor ?? "text.primary" }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
  )
}
