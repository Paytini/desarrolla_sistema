import { Suspense } from "react"
import { Urbanist, Epilogue } from "next/font/google"
import { PortalThemeProvider } from "@/components/providers/PortalThemeProvider"
import { PageSkeleton } from "@/components/shared/PageSkeleton"
import EmployeeSearchBar from "@/components/search/EmployeeSearchBar"
import { FullscreenToggle } from "@/components/layout/FullscreenToggle"
import { MobileNav } from "@/components/layout/MobileNav"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { PortalGreeting } from "@/components/layout/PortalGreeting"
import HrSearchBar from "@/components/search/HrSearchBar"
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
  const isSuperAdmin = rol === "SUPERADMIN"

  const content = (
    <div className={cn("flex h-screen overflow-hidden", urbanist.variable, epilogue.variable, "portal-v4")}>
      <Sidebar rol={rol} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 md:px-6">
          <MobileNav rol={rol} nombre={nombre} empresa={empresa} />

          {isSuperAdmin ? (
            <div className="flex-1" style={{ maxWidth: 560 }}>
              <SuperadminSearchBar />
            </div>
          ) : (
            <PortalGreeting nombre={nombre} rol={rol} />
          )}

          <div className="flex-1" />

          <div className="flex shrink-0 items-center gap-2">
            {rol === "RH" && <HrSearchBar />}
            {rol === "EMPLEADO" && <EmployeeSearchBar />}
            <NotificationBell />
            <FullscreenToggle />
            <TopbarUserMenu nombre={nombre} rol={rol} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#F8F9FC] px-8 py-7">
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

  return <PortalThemeProvider>{content}</PortalThemeProvider>
}
