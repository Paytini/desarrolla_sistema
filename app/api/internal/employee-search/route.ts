import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.rol !== "EMPLEADO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ courses: [], certificates: [] })
  }

  const employee = await prisma.employee.findUnique({
    where: { email: session.user.email ?? "" },
    select: { id: true },
  })

  if (!employee) {
    return NextResponse.json({ courses: [], certificates: [] })
  }

  const [coursesResult, certificatesResult] = await Promise.all([
    prisma.employeeCourse.findMany({
      where: {
        employee_id: employee.id,
        course_name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, course_name: true, progress_pct: true, completed: true },
      take: 5,
    }),
    prisma.certificate.findMany({
      where: {
        employee_id: employee.id,
        course_name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, course_name: true, reference_number: true },
      take: 3,
    }),
  ])

  const courses = coursesResult.map((c) => ({
    id: c.id,
    course_name: c.course_name,
    progress_pct: c.progress_pct,
    completed: c.completed,
  }))
  const certificates = certificatesResult.map((c) => ({
    id: c.id,
    course_name: c.course_name,
    reference_number: c.reference_number,
  }))

  return NextResponse.json({ courses, certificates })
}
