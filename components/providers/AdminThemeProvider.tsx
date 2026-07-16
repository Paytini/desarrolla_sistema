"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@mui/material/styles"
import { muiThemeAdminV4 } from "@/lib/mui-theme"

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={muiThemeAdminV4}>{children}</ThemeProvider>
}
