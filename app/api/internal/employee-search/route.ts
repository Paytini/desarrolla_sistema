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
    return NextResponse.json({ cursos: [], constancias: [] })
  }

  const empleado = await prisma.employee.findUnique({
    where: { email: session.user.email ?? "" },
    select: { id: true },
  })

  if (!empleado) {
    return NextResponse.json({ cursos: [], constancias: [] })
  }

  const [cursosResult, constanciasResult] = await Promise.all([
    prisma.employeeCourse.findMany({
      where: {
        employee_id: empleado.id,
        course_name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, course_name: true, progress_pct: true, completed: true },
      take: 5,
    }),
    prisma.certificate.findMany({
      where: {
        employee_id: empleado.id,
        course_name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, course_name: true, reference_number: true },
      take: 3,
    }),
  ])

  const cursos = cursosResult.map((c) => ({
    id: c.id,
    nombre_curso: c.course_name,
    progreso_pct: c.progress_pct,
    completado: c.completed,
  }))
  const constancias = constanciasResult.map((c) => ({
    id: c.id,
    nombre_curso: c.course_name,
    folio: c.reference_number,
  }))

  return NextResponse.json({ cursos, constancias })
}
