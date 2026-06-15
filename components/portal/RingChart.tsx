import { Box, CircularProgress, Typography } from "@mui/material"

export function RingChart({
  pct,
  size = 56,
  sw = 6,
  color,
}: {
  pct: number
  size?: number
  sw?: number
  color: string
}) {
  const value = Math.min(pct, 100)
  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={sw}
        sx={{ position: "absolute", color: "#EFEAE3" }}
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
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.primary" }}>
          {pct}%
        </Typography>
      </Box>
    </Box>
  )
}
