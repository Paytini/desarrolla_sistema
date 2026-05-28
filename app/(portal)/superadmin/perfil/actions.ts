"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

export async function changePasswordAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") redirect("/login")

  const current = (formData.get("current_password") as string | null) ?? ""
  const next    = (formData.get("new_password")     as string | null) ?? ""
  const confirm = (formData.get("confirm_password") as string | null) ?? ""

  if (!current || !next || !confirm) {
    redirect("/superadmin/perfil?error=missing_fields")
  }
  if (next !== confirm) {
    redirect("/superadmin/perfil?error=password_mismatch")
  }
  if (next.length < 8) {
    redirect("/superadmin/perfil?error=password_too_short")
  }

  const usuario = await prisma.usuario.findUnique({
    where:  { id: Number(session.user.id) },
    select: { password_hash: true },
  })
  if (!usuario) redirect("/login")

  const valid = await bcrypt.compare(current, usuario.password_hash)
  if (!valid) redirect("/superadmin/perfil?error=wrong_password")

  await prisma.usuario.update({
    where: { id: Number(session.user.id) },
    data:  { password_hash: await bcrypt.hash(next, 12) },
  })

  redirect("/superadmin/perfil?success=password_changed")
}
