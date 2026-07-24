import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ empleados: [], cursos: [] })
  }

  const empresaId = session.user.empresa_id

  const [empleados, cursos] = await Promise.all([
    prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { apellido: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { departamento: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true, apellido: true, email: true, departamento: true },
      take: 5,
    }),
    prisma.paqueteCurso.findMany({
      where: {
        nombre_curso: { contains: q, mode: "insensitive" },
        paquete: {
          empresas: { some: { empresa_id: empresaId, activo: true } },
        },
      },
      select: { wp_curso_id: true, nombre_curso: true },
      take: 4,
    }),
  ])

  return NextResponse.json({ empleados, cursos })
}
