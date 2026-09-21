import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import GlobalLoadingController from "@/components/layout/GlobalLoadingController"
import OfflineBanner from "@/components/layout/OfflineBanner"
import { MuiProviders } from "@/components/providers/MuiProviders"
import "./globals.css"
import { cn } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Desarrolla360 Portal Empresarial",
  description:
    "Portal B2B para empresas, HR, empleados y monitoreo academico de paquetes corporativos.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("h-full antialiased", inter.variable, "font-sans")}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        <MuiProviders>
          <OfflineBanner />
          <Suspense fallback={null}>
            <GlobalLoadingController />
          </Suspense>
          {children}
          <Analytics />
        </MuiProviders>
      </body>
    </html>
  )
}
