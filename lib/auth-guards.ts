import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getEmpresaAccessStatus } from "@/lib/empresa-status"

export async function requireSuperAdminSession() {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") {
    redirect("/login")
  }

  return session
}

export async function requireRhSession() {
  const session = await auth()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    redirect("/login")
  }

  const status = await getEmpresaAccessStatus(session.user.empresa_id)
  if (status.blocked) {
    redirect(`/cuenta-suspendida?reason=${status.reason}`)
  }

  return session
}
