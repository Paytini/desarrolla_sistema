import EmpleadoSearchBar from "@/components/portal/EmpleadoSearchBar"
import { MobileNav } from "@/components/portal/MobileNav"
import { PortalGreeting } from "@/components/portal/PortalGreeting"
import RhSearchBar from "@/components/portal/RhSearchBar"
import SuperadminSearchBar from "@/components/portal/SuperadminSearchBar"
import Sidebar from "@/components/Sidebar"
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar rol={rol} nombre={nombre} empresa={empresa} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-6 border-b border-slate-100 bg-white px-4 md:px-8">
          <div className="flex items-center gap-2">
            <MobileNav rol={rol} nombre={nombre} empresa={empresa} />
            <PortalGreeting nombre={nombre} rol={rol} />
          </div>
          <div className="shrink-0">
            {rol === "SUPERADMIN" && <SuperadminSearchBar />}
            {rol === "RH" && <RhSearchBar />}
            {rol === "EMPLEADO" && <EmpleadoSearchBar />}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
