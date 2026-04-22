import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function EmpleadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO") redirect("/login")

  return <>{children}</>
}
