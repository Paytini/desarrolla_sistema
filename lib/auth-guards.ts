import { redirect } from "next/navigation"
import { auth } from "@/auth"

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

  return session
}
