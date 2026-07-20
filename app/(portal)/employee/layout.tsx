import { getSession } from "@/lib/session"
import { getEmpresaAccessStatus } from "@/lib/empresa-status"
import { redirect } from "next/navigation"

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO" || !session.user.empresa_id) redirect("/login")

  const status = await getEmpresaAccessStatus(session.user.empresa_id)
  if (status.blocked) redirect(`/cuenta-suspendida?reason=${status.reason}`)

  return <>{children}</>
}
