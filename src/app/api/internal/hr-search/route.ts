import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ employees: [], courses: [] })
  }

  const companyId = session.user.empresa_id

  const [employeesResult, coursesResult] = await Promise.all([
    prisma.employee.findMany({
      where: {
        company_id: companyId,
        active: true,
        OR: [
          { first_name: { contains: q, mode: "insensitive" } },
          { last_name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { department: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, first_name: true, last_name: true, email: true, department: true },
      take: 5,
    }),
    prisma.packageCourse.findMany({
      where: {
        course_name: { contains: q, mode: "insensitive" },
        package: {
          companies: { some: { company_id: companyId, active: true } },
        },
      },
      select: { wp_course_id: true, course_name: true },
      take: 4,
    }),
  ])

  const employees = employeesResult.map((e) => ({
    id: e.id,
    first_name: e.first_name,
    last_name: e.last_name,
    email: e.email,
    department: e.department,
  }))
  const courses = coursesResult.map((c) => ({
    wp_course_id: c.wp_course_id,
    course_name: c.course_name,
  }))

  return NextResponse.json({ employees, courses })
}
