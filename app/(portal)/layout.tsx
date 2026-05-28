import EmpleadoSearchBar from "@/components/portal/EmpleadoSearchBar"
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar rol={rol} nombre={nombre} empresa={empresa} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6">
          {rol === "SUPERADMIN" && <SuperadminSearchBar />}
          {rol === "RH" && <RhSearchBar />}
          {rol === "EMPLEADO" && <EmpleadoSearchBar />}
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
