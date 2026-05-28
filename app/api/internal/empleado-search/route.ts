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

  const empleado = await prisma.empleado.findUnique({
    where: { email: session.user.email ?? "" },
    select: { id: true },
  })

  if (!empleado) {
    return NextResponse.json({ cursos: [], constancias: [] })
  }

  const [cursos, constancias] = await Promise.all([
    prisma.empleadoCurso.findMany({
      where: {
        empleado_id: empleado.id,
        nombre_curso: { contains: q, mode: "insensitive" },
      },
      select: { id: true, nombre_curso: true, progreso_pct: true, completado: true },
      take: 5,
    }),
    prisma.constancia.findMany({
      where: {
        empleado_id: empleado.id,
        nombre_curso: { contains: q, mode: "insensitive" },
      },
      select: { id: true, nombre_curso: true, folio: true },
      take: 3,
    }),
  ])

  return NextResponse.json({ cursos, constancias })
}
