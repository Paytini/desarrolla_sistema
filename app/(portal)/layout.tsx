import EmpleadoSearchBar from "@/components/portal/EmpleadoSearchBar"
import RhSearchBar from "@/components/portal/RhSearchBar"
import SuperadminSearchBar from "@/components/portal/SuperadminSearchBar"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar rol={rol} nombre={nombre} empresa={empresa} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-[60px] shrink-0 items-center gap-3 bg-card border-b border-border px-8">
          <div className="flex-1">
            {rol === "SUPERADMIN" && <SuperadminSearchBar />}
            {rol === "RH" && <RhSearchBar />}
            {rol === "EMPLEADO" && <EmpleadoSearchBar />}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notificaciones"
            title="Próximamente: Notificaciones"
            className="relative cursor-default text-muted-foreground"
          >
            <Bell size={15} strokeWidth={1.8} />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
