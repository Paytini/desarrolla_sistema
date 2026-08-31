"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@mui/material/styles"
import { muiThemeV4 } from "@/lib/mui-theme"

export function PortalThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={muiThemeV4}>{children}</ThemeProvider>
}
