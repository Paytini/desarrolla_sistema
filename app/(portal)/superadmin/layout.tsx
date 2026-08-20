import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") redirect("/login")

  return <>{children}</>
}
