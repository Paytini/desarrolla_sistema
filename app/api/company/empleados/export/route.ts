import { auth } from "@/auth"
import {
  matchesEmployeeFilters,
  normalizeEmployeeFilterStatus,
  normalizeEmployeeSearchQuery,
} from "@/lib/company-employees"
import { formatDateTime } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { toCsvText } from "@/lib/csv"

export async function GET(request: Request) {
  const session = await auth()
  if (!session || session.user.rol !== "RH" || !session.user.empresa_id) {
    return new Response("No autorizado", { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = normalizeEmployeeSearchQuery(searchParams.get("q"))
  const status = normalizeEmployeeFilterStatus(searchParams.get("status"))

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresa_id },
    include: {
      empleados: {
        include: {
          cursos: {
            select: {
              acceso_estado: true,
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

  const filteredEmployees = empresa.empleados.filter((empleado) =>
    matchesEmployeeFilters(empleado, {
      query,
      status,
    })
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
      empleado.nombre,
      empleado.apellido,
      empleado.email,
      empleado.curp ?? "",
      empleado.departamento ?? "",
      empleado.puesto ?? "",
      empleado.ocupacion_especifica_clave ?? "",
      empleado.ocupacion_especifica ?? "",
      empleado.activo ? "Activo" : "Suspendido",
      empleado.wp_user_id ?? "",
      empleado.cursos.filter((curso) => curso.acceso_estado === "ACTIVE").length,
      empleado.cursos.filter((curso) => curso.acceso_estado === "PENDING").length,
      empleado.cursos.filter((curso) => curso.acceso_estado === "ERROR").length,
      formatDateTime(empleado.created_at),
    ]),
  ]

  const csv = `\uFEFF${toCsvText(rows)}`
  const filename = `empleados-${empresa.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "empresa"}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
