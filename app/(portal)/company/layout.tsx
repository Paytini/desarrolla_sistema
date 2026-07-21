import { getSession } from "@/lib/session"
import { getCompanyAccessStatus } from "@/lib/company-status"
import { redirect } from "next/navigation"

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) redirect("/login")

  const status = await getCompanyAccessStatus(session.user.empresa_id)
  if (status.blocked) redirect(`/account-suspended?reason=${status.reason}`)

  return <>{children}</>
}
