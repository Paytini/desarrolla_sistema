"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { generateCanvaDc3ForConstancia } from "@/lib/canva"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

function getReturnTo(formData: FormData) {
  const value = String(formData.get("return_to") ?? "").trim()
  if (value.startsWith("/empresa/constancias") || value.startsWith("/empleado/constancias")) {
    return value
  }

  return "/empresa/constancias"
}

export async function generateCanvaDc3Action(formData: FormData) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const returnTo = getReturnTo(formData)
  const constanciaId = Number.parseInt(String(formData.get("constancia_id") ?? "0"), 10)
  if (!constanciaId) {
    redirect(`${returnTo}?error=constancia`)
  }

  const constancia = await prisma.constancia.findUnique({
    where: { id: constanciaId },
    include: {
      empleado: {
        select: {
          email: true,
          empresa_id: true,
        },
      },
    },
  })

  if (!constancia) {
    redirect(`${returnTo}?error=constancia`)
  }

  const canGenerate =
    session.user.rol === "SUPERADMIN" ||
    (session.user.rol === "RH" && session.user.empresa_id === constancia.empleado.empresa_id) ||
    (session.user.rol === "EMPLEADO" &&
      session.user.email?.toLowerCase() === constancia.empleado.email.toLowerCase())

  if (!canGenerate) {
    redirect(`${returnTo}?error=no_autorizado`)
  }

  try {
    await generateCanvaDc3ForConstancia(constanciaId)
  } catch {
    revalidatePath("/empresa/constancias")
    revalidatePath("/empleado/constancias")
    redirect(`${returnTo}?error=canva_dc3`)
  }

  revalidatePath("/empresa/constancias")
  revalidatePath("/empleado/constancias")
  redirect(`${returnTo}?success=canva_dc3`)
}
