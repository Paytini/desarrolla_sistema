"use client"

import type { ReactNode } from "react"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import { ThemeProvider } from "@mui/material/styles"
import { muiTheme } from "@/lib/mui-theme"

export function MuiProviders({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  )
}
