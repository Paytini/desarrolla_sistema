import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"

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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar rol={rol} nombre={nombre} empresa={empresa} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
