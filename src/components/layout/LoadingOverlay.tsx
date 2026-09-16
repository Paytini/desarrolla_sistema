import { Backdrop, Box, CircularProgress, Typography } from "@mui/material"
import Image from "next/image"

type LoadingOverlayProps = {
  message?: string
  detail?: string
}

export default function LoadingOverlay({ message = "Cargando...", detail }: LoadingOverlayProps) {
  return (
    <Backdrop
      open
      sx={{
        color: "#ffffff",
        zIndex: (theme) => theme.zIndex.drawer + 999,
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          size={80}
          thickness={2}
          sx={{
            color: "primary.main",
            position: "absolute",
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <Image
            src="/assets/fav_icon_desarrolla_v2.jpeg"
            alt="Brand Icon"
            width={48}
            height={48}
            style={{ objectFit: "cover" }}
          />
        </Box>
      </Box>

      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            letterSpacing: "0.05em",
            animation: "fadeInOut 2s ease-in-out infinite",
            "@keyframes fadeInOut": {
              "0%, 100%": { opacity: 0.6 },
              "50%": { opacity: 1 },
            },
          }}
        >
          {message}
        </Typography>
        {detail ? (
          <Typography sx={{ mt: 0.5, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {detail}
          </Typography>
        ) : null}
      </Box>
    </Backdrop>
  )
}
