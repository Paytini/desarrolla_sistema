import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Suspense } from "react"
import GlobalLoadingController from "@/components/portal/GlobalLoadingController"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Desarrolla360 Portal Empresarial",
  description: "Portal B2B para empresas, RH, empleados y monitoreo academico de paquetes corporativos.",
  icons: {
    icon: "/assets/logo_desarrolla_cropped.png",
    apple: "/assets/logo_desarrolla_cropped.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`h-full antialiased ${dmSans.variable}`}>
      <body className={`min-h-full flex flex-col font-[family-name:var(--font-dm-sans)]`}>
        <Suspense fallback={null}>
          <GlobalLoadingController />
        </Suspense>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
