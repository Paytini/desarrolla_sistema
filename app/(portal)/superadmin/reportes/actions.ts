"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { scheduleStaleEmployeeLearningBatch } from "@/lib/employee-learning"

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.rol !== "SUPERADMIN") {
    redirect("/login")
  }
}

export async function triggerGlobalLearningSyncAction() {
  await requireSuperAdmin()

  const queued = scheduleStaleEmployeeLearningBatch({ limit: 100 })

  revalidatePath("/superadmin/reportes")
  revalidatePath("/empleado/cursos")
  revalidatePath("/empleado/progreso")
  revalidatePath("/empleado/constancias")

  redirect(`/superadmin/reportes?success=${queued ? "sync_background_started" : "sync_background_already_running"}`)
}
