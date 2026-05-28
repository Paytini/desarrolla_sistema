import EmpleadoSearchBar from "@/components/portal/EmpleadoSearchBar"
import RhSearchBar from "@/components/portal/RhSearchBar"
import SuperadminSearchBar from "@/components/portal/SuperadminSearchBar"
import Sidebar from "@/components/Sidebar"
import { getSession } from "@/lib/session"
import { Bell } from "lucide-react"
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
    <div className="flex h-screen overflow-hidden bg-[#f6f6f6]">
      <Sidebar rol={rol} nombre={nombre} empresa={empresa} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-[#f0f0f0] bg-white px-8 gap-3">
          <div className="flex-1">
            {rol === "SUPERADMIN" && <SuperadminSearchBar />}
            {rol === "RH" && <RhSearchBar />}
            {rol === "EMPLEADO" && <EmpleadoSearchBar />}
          </div>
          <button
            type="button"
            aria-label="Notificaciones"
            title="Próximamente: Notificaciones"
            className="relative flex size-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white cursor-default"
          >
            <Bell size={16} strokeWidth={1.8} className="text-[#64748b]" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto py-7 px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
