"use server"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { hashPassword } from "@/lib/onboarding"
import { prisma } from "@/lib/prisma"

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/login")
  }

  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirm_password") ?? "")

  if (password.length < 8) {
    redirect("/employee/cambiar-contrasena?error=corta")
  }

  if (password !== confirmPassword) {
    redirect("/employee/cambiar-contrasena?error=no_coincide")
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password_hash: passwordHash, must_change_password: false },
  })

  redirect("/employee/courses")
}
