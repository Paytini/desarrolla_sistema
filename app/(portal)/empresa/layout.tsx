import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH") redirect("/login")

  return <>{children}</>
}
