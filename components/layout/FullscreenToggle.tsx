"use client"

import { useEffect, useState } from "react"
import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  function toggle() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <Tooltip title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} placement="bottom">
      <Box
        component="button"
        onClick={toggle}
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          border: "none",
          background: "none",
          borderRadius: "8px",
          cursor: "pointer",
          color: "text.secondary",
          transition: "background 0.15s ease, color 0.15s ease",
          "&:hover": { bgcolor: "action.hover", color: "text.primary" },
        }}
      >
        <i
          className={isFullscreen ? "ri-fullscreen-exit-line" : "ri-fullscreen-line"}
          style={{ fontSize: "1.125rem", lineHeight: 1 }}
        />
      </Box>
    </Tooltip>
  )
}
