import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import GlobalLoadingController from "@/components/layout/GlobalLoadingController";
import { MuiProviders } from "@/components/providers/MuiProviders";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Desarrolla360 Portal Empresarial",
  description:
    "Portal B2B para empresas, RH, empleados y monitoreo academico de paquetes corporativos.",
  icons: {
    icon: "/assets/logo_desarrolla_cropped.png",
    apple: "/assets/logo_desarrolla_cropped.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={cn("h-full antialiased", inter.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        <MuiProviders>
          <Suspense fallback={null}>
            <GlobalLoadingController />
          </Suspense>
          {children}
          <SpeedInsights />
        </MuiProviders>
      </body>
    </html>
  );
}
