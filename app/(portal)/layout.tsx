import { Suspense } from "react"
import { Urbanist, Epilogue } from "next/font/google"
import { AdminThemeProvider } from "@/components/providers/AdminThemeProvider"
import { PageSkeleton } from "@/components/shared/PageSkeleton"
import EmpleadoSearchBar from "@/components/search/EmpleadoSearchBar"
import { FullscreenToggle } from "@/components/layout/FullscreenToggle"
import { MobileNav } from "@/components/layout/MobileNav"
import { PortalGreeting } from "@/components/layout/PortalGreeting"
import RhSearchBar from "@/components/search/RhSearchBar"
import SuperadminSearchBar from "@/components/search/SuperadminSearchBar"
import Sidebar from "@/components/layout/Sidebar"
import { TopbarUserMenu } from "@/components/layout/TopbarUserMenu"
import { OnboardingTour } from "@/components/layout/OnboardingTour"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap",
})

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-epilogue",
  display: "swap",
})

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const rol     = session.user.rol     as "SUPERADMIN" | "RH" | "EMPLEADO"
  const nombre  = session.user.nombre  as string
  const email   = session.user.email   ?? nombre
  const empresa = session.user.empresa as string | undefined
  
  const isAdminV4 = rol === "SUPERADMIN"

  const content = (
    <div
      className={cn(
        "flex h-screen overflow-hidden",
        isAdminV4 && cn(urbanist.variable, epilogue.variable, "role-admin-v4")
      )}
    >
      <Sidebar rol={rol} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 md:px-6">
          <MobileNav rol={rol} nombre={nombre} empresa={empresa} />

          <PortalGreeting nombre={nombre} rol={rol} />

          <div className="flex-1" />

          <div className="flex shrink-0 items-center gap-2">
            {rol === "SUPERADMIN" && <SuperadminSearchBar />}
            {rol === "RH" && <RhSearchBar />}
            {rol === "EMPLEADO" && <EmpleadoSearchBar />}
            <FullscreenToggle />
            <TopbarUserMenu nombre={nombre} rol={rol} />
          </div>
        </header>
        <main className={cn("flex-1 overflow-y-auto px-8 py-7", isAdminV4 ? "bg-[#F8F9FC]" : "bg-[#F3F4F6]")}>
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </main>
      </div>

      {(rol === "RH" || rol === "EMPLEADO") && (
        <OnboardingTour rol={rol} userId={email} />
      )}
    </div>
  )

  return isAdminV4 ? (
    <AdminThemeProvider>{content}</AdminThemeProvider>
  ) : content
}
