import type { Metadata } from "next"
import { DM_Sans, Geist, Bricolage_Grotesque } from "next/font/google"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Suspense } from "react"
import GlobalLoadingController from "@/components/portal/GlobalLoadingController"
import { MuiProviders } from "@/components/mui/MuiProviders"
import "./globals.css"
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
})

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
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
    <html lang="es" className={cn("h-full", "antialiased", dmSans.variable, "font-sans", geist.variable, bricolage.variable)}>
      <body className={`min-h-full flex flex-col font-[family-name:var(--font-dm-sans)]`}>
        <MuiProviders>
          <Suspense fallback={null}>
            <GlobalLoadingController />
          </Suspense>
          {children}
          <SpeedInsights />
        </MuiProviders>
      </body>
    </html>
  )
}
