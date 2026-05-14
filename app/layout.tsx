import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import GlobalLoadingController from "@/components/portal/GlobalLoadingController";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desarrolla360 Portal Empresarial",
  description: "Portal B2B para empresas, RH, empleados y monitoreo academico de paquetes corporativos.",
  icons: {
    icon: "/assets/logo_desarrolla_cropped.png",
    apple: "/assets/logo_desarrolla_cropped.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <GlobalLoadingController />
        </Suspense>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
