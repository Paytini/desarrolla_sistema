"use server"

import { redirect } from "next/navigation"
import { requireHrSession } from "@/lib/auth-guards"
import { requireCompanySlug } from "@/lib/company/branding"
import { companyPath } from "@/lib/company/routes"
import { notifyUsuarioByEmail } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

function getInt(formData: FormData, key: string) {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10)
  return Number.isInteger(value) ? value : null
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function sendCourseReminderAction(formData: FormData) {
  const session = await requireHrSession()
  const companyId = session.user.empresa_id as string
  const slug = await requireCompanySlug(companyId)

  const courseId = getInt(formData, "curso_id")
  const courseName = getString(formData, "curso_nombre") || "un curso"

  if (!courseId) {
    redirect(companyPath(slug, "/progress"))
  }

  const pendingEmployees = await prisma.employeeCourse.findMany({
    where: {
      wp_course_id: courseId,
      completed: false,
      employee: { company_id: companyId, active: true },
    },
    select: {
      employee: { select: { email: true } },
    },
  })

  for (const row of pendingEmployees) {
    await notifyUsuarioByEmail(row.employee.email, {
      tipo: "CURSO_RECORDATORIO",
      titulo: "Recordatorio de curso pendiente",
      mensaje: `Tienes el curso "${courseName}" pendiente de completar. ¡Termínalo pronto!`,
    })
  }

  redirect(
    companyPath(slug, `/progress/${courseId}?recordatorio=ok&count=${pendingEmployees.length}`),
  )
}
