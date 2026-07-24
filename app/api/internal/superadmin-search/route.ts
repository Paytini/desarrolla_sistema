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

  const [companies, employees, packages] = await Promise.all([
    prisma.company.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, active: true },
      take: 5,
    }),
    prisma.employee.findMany({
      where: {
        OR: [
          { first_name: { contains: q, mode: "insensitive" } },
          { last_name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        company: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.package.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, active: true },
      take: 3,
    }),
  ])

  const empresas = companies.map((c) => ({ id: c.id, nombre: c.name, activo: c.active }))
  const empleados = employees.map((e) => ({
    id: e.id,
    nombre: e.first_name,
    apellido: e.last_name,
    email: e.email,
    empresa: { nombre: e.company.name },
  }))
  const paquetes = packages.map((p) => ({ id: p.id, nombre: p.name, activo: p.active }))

  return NextResponse.json({ empresas, empleados, paquetes })
}
