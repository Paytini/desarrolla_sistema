"use server"

import { redirect } from "next/navigation"
import { completeActivation, findUserByValidActivationToken } from "@/lib/onboarding"

function activationPath(token: string, query?: string) {
  return `/activar-cuenta/${token}${query ?? ""}`
}

export async function activateAccountAction(token: string, formData: FormData) {
  const user = await findUserByValidActivationToken(token)
  if (!user) {
    redirect("/login?error=activation_invalid")
  }

  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirm_password") ?? "")

  if (password.length < 8) {
    redirect(activationPath(token, "?error=corta"))
  }

  if (password !== confirmPassword) {
    redirect(activationPath(token, "?error=no_coincide"))
  }

  await completeActivation(user.id, password)

  redirect("/login?success=activated")
}
