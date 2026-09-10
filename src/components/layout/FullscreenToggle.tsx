"use client"

import { useEffect, useState } from "react"
import { Expand, Shrink } from "lucide-react"
import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import { fd } from "@/lib/theme-tokens"

export function FullscreenToggle({ dark = false }: { dark?: boolean }) {
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
    <Tooltip
      title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      placement="bottom"
    >
      <Box
        component="button"
        onClick={toggle}
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          bgcolor: dark ? "rgba(255,255,255,0.1)" : fd.background,
          boxShadow: dark ? "none" : "0 1px 3px rgba(15,23,42,0.1)",
          color: dark ? "var(--sidebar-navy-text)" : "text.secondary",
          transition: "background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
          "&:hover": dark
            ? { bgcolor: "rgba(255,255,255,0.18)", color: "var(--sidebar-navy-text-strong)" }
            : {
                bgcolor: fd.background,
                boxShadow: "0 2px 8px rgba(15,23,42,0.16)",
                color: "text.primary",
              },
        }}
      >
        {isFullscreen ? <Shrink size={19} strokeWidth={2} /> : <Expand size={19} strokeWidth={2} />}
      </Box>
    </Tooltip>
  )
}
