"use client"

import type { ReactNode } from "react"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import { ThemeProvider } from "@mui/material/styles"
import { muiTheme } from "@/lib/mui-theme"

// Separate Client Component required: passing `muiTheme` (a createTheme() object
// containing functions) as a prop from the Server Component app/layout.tsx to
// ThemeProvider would crash Next.js server/client serialization.
export function MuiProviders({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  )
}
