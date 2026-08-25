import Typography from "@mui/material/Typography"
import type { SxProps, Theme } from "@mui/material/styles"
import type { ReactNode } from "react"

type EyebrowLabelProps = {
  children: ReactNode
  color?: string
  sx?: SxProps<Theme>
}

export default function EyebrowLabel({ children, color = "text.disabled", sx }: EyebrowLabelProps) {
  return (
    <Typography
      sx={[
        {
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color,
        },
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      {children}
    </Typography>
  )
}
