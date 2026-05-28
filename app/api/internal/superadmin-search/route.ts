import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ empresas: [], empleados: [], paquetes: [] })
  }

  const [empresas, empleados, paquetes] = await Promise.all([
    prisma.empresa.findMany({
      where: { nombre: { contains: q, mode: "insensitive" } },
      select: { id: true, nombre: true, activo: true },
      take: 5,
    }),
    prisma.empleado.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { apellido: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        empresa: { select: { nombre: true } },
      },
      take: 5,
    }),
    prisma.paquete.findMany({
      where: { nombre: { contains: q, mode: "insensitive" } },
      select: { id: true, nombre: true, activo: true },
      take: 3,
    }),
  ])

  return NextResponse.json({ empresas, empleados, paquetes })
}
