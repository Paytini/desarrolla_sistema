"use server"

import { redirect } from "next/navigation"
import { signOut } from "@/auth"
import { getSession } from "@/lib/session"
import { hashPassword } from "@/lib/onboarding"
import { prisma } from "@/lib/prisma"

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { must_change_password: true },
  })

  if (!user?.must_change_password) {
    redirect("/employee/courses")
  }

  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirm_password") ?? "")

  if (password.length < 8) {
    redirect("/employee/change-password?error=corta")
  }

  if (password !== confirmPassword) {
    redirect("/employee/change-password?error=no_coincide")
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password_hash: passwordHash, must_change_password: false },
  })

  await signOut({ redirect: false })
  redirect("/login?success=activated")
}
