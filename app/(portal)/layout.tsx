import EmpleadoSearchBar from "@/components/search/EmpleadoSearchBar"
import { FullscreenToggle } from "@/components/layout/FullscreenToggle"
import { MobileNav } from "@/components/layout/MobileNav"
import { PortalGreeting } from "@/components/layout/PortalGreeting"
import RhSearchBar from "@/components/search/RhSearchBar"
import SuperadminSearchBar from "@/components/search/SuperadminSearchBar"
import Sidebar from "@/components/layout/Sidebar"
import { TopbarUserMenu } from "@/components/layout/TopbarUserMenu"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  const rol     = session.user.rol     as "SUPERADMIN" | "RH" | "EMPLEADO"
  const nombre  = session.user.nombre  as string
  const empresa = session.user.empresa as string | undefined

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={rol} nombre={nombre} empresa={empresa} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-[76px] shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
          {/* Mobile hamburger */}
          <MobileNav rol={rol} nombre={nombre} empresa={empresa} />

          {/* Left — greeting */}
          <PortalGreeting nombre={nombre} rol={rol} />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right — search + fullscreen + user menu */}
          <div className="flex shrink-0 items-center gap-2">
            {rol === "SUPERADMIN" && <SuperadminSearchBar />}
            {rol === "RH" && <RhSearchBar />}
            {rol === "EMPLEADO" && <EmpleadoSearchBar />}
            <FullscreenToggle />
            <TopbarUserMenu nombre={nombre} rol={rol} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#F5F5F9] px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
