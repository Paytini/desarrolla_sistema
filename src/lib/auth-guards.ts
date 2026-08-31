import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getCompanyAccessStatus } from "@/lib/company/status"
import { enterCompanyContext } from "@/lib/tenant-context"

export async function requireSuperAdminSession() {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") {
    redirect("/login")
  }

  return session
}

export async function requireHrSession() {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) {
    redirect("/login")
  }

  const status = await getCompanyAccessStatus(session.user.empresa_id)
  if (status.blocked) {
    redirect(`/account-suspended?reason=${status.reason}`)
  }

  // Scopes every Employee/CompanyPackage query made for the rest of this
  // request/action to this company — see lib/prisma.ts tenant guard.
  enterCompanyContext(session.user.empresa_id)

  return session
}
