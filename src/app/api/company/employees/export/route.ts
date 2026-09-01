import { auth } from "@/auth"
import {
  matchesEmployeeFilters,
  normalizeEmployeeFilterStatus,
  normalizeEmployeeSearchQuery,
} from "@/lib/company/employees"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { toCsvText } from "@/lib/csv"

export const maxDuration = 60

export async function GET(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== "HR" || !session.user.empresa_id) {
    return new Response("No autorizado", { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = normalizeEmployeeSearchQuery(searchParams.get("q"))
  const status = normalizeEmployeeFilterStatus(searchParams.get("status"))

  const empresa = await prisma.company.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      employees: {
        include: {
          courses: {
            select: {
              access_status: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
    },
  })

  if (!empresa) {
    return new Response("Empresa no encontrada", { status: 404 })
  }

  const filteredEmployees = empresa.employees.filter((empleado) =>
    matchesEmployeeFilters(empleado, {
      query,
      status,
    }),
  )

  const rows = [
    [
      "nombre",
      "apellido",
      "email",
      "curp",
      "departamento",
      "puesto",
      "ocupacion_especifica_clave",
      "ocupacion_especifica",
      "estado",
      "wp_user_id",
      "cursos_activos",
      "cursos_pendientes",
      "cursos_con_error",
      "fecha_alta",
    ],
    ...filteredEmployees.map((empleado) => [
      empleado.first_name,
      empleado.last_name,
      empleado.email,
      empleado.curp ?? "",
      empleado.department ?? "",
      empleado.position ?? "",
      empleado.occupation_code ?? "",
      empleado.occupation_name ?? "",
      empleado.active ? "Activo" : "Suspendido",
      empleado.wp_user_id ?? "",
      empleado.courses.filter((curso) => curso.access_status === "ACTIVE").length,
      empleado.courses.filter((curso) => curso.access_status === "PENDING").length,
      empleado.courses.filter((curso) => curso.access_status === "ERROR").length,
      formatDateTime(empleado.created_at),
    ]),
  ]

  const csv = `\uFEFF${toCsvText(rows)}`
  const filename = `empleados-${empresa.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "empresa"}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
