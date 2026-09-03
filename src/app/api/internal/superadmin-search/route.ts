import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ companies: [], employees: [], packages: [] })
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

  const companiesResult = companies.map((c) => ({ id: c.id, name: c.name, active: c.active }))
  const employeesResult = employees.map((e) => ({
    id: e.id,
    first_name: e.first_name,
    last_name: e.last_name,
    email: e.email,
    company: { name: e.company.name },
  }))
  const packagesResult = packages.map((p) => ({ id: p.id, name: p.name, active: p.active }))

  return NextResponse.json({
    companies: companiesResult,
    employees: employeesResult,
    packages: packagesResult,
  })
}
