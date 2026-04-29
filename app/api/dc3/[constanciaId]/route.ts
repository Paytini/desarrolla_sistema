import { auth } from "@/auth"
import { buildDc3Document } from "@/lib/dc3"
import { prisma } from "@/lib/prisma"
import { bridgeGetCourseDetails, isWordPressBridgeConfigured } from "@/lib/wordpress-bridge"

type RouteContext = {
  params: { constanciaId: string } | Promise<{ constanciaId: string }>
}

function parseConstanciaId(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(request: Request, context: RouteContext) {
  const session = await auth()
  if (!session) {
    return new Response("No autorizado", { status: 401 })
  }

  const params = await Promise.resolve(context.params)
  const constanciaId = parseConstanciaId(params.constanciaId)
  if (!constanciaId) {
    return new Response("Constancia invalida", { status: 400 })
  }

  const constancia = await prisma.constancia.findUnique({
    where: { id: constanciaId },
    include: {
      empleado: {
        include: {
          empresa: true,
        },
      },
    },
  })

  if (!constancia) {
    return new Response("Constancia no encontrada", { status: 404 })
  }

  const role = session.user.rol
  const sameCompany = session.user.empresa_id === constancia.empleado.empresa_id
  const sameEmployee =
    (session.user.email ?? "").trim().toLowerCase() ===
    constancia.empleado.email.toLowerCase()

  const canAccess =
    role === "SUPERADMIN" || (role === "RH" && sameCompany) || (role === "EMPLEADO" && sameEmployee)

  if (!canAccess) {
    return new Response("No autorizado para ver este DC-3", { status: 403 })
  }

  const curso = await prisma.empleadoCurso.findUnique({
    where: {
      empleado_id_wp_curso_id: {
        empleado_id: constancia.empleado_id,
        wp_curso_id: constancia.wp_curso_id,
      },
    },
  })

  let courseDetails: Awaited<ReturnType<typeof bridgeGetCourseDetails>> | null = null
  if (isWordPressBridgeConfigured()) {
    try {
      courseDetails = await bridgeGetCourseDetails(constancia.wp_curso_id)
    } catch {
      courseDetails = null
    }
  }

  const dc3 = buildDc3Document({
    constanciaId: constancia.id,
    constanciaFolio: constancia.folio,
    courseName: constancia.nombre_curso,
    employeeFullName: `${constancia.empleado.nombre} ${constancia.empleado.apellido}`.trim(),
    employeeOccupation: constancia.empleado.puesto,
    employeePosition: constancia.empleado.puesto,
    companyName: constancia.empleado.empresa.nombre,
    companyRfc: constancia.empleado.empresa.rfc,
    instructorName: courseDetails?.instructor_name ?? "Equipo de capacitacion Desarrolla360",
    trainingAgentName:
      courseDetails?.training_agent_name ?? courseDetails?.instructor_name ?? "Desarrolla360",
    durationHours: courseDetails?.duration_hours ?? null,
    courseStartedAt: curso?.fecha_inicio_curso ?? null,
    courseCompletedAt: curso?.fecha_completado ?? constancia.fecha_emision,
    issueDate: constancia.fecha_emision,
    courseThematicArea: courseDetails?.thematic_area_name ?? null,
    courseThematicAreaCode: courseDetails?.thematic_area_code ?? null,
  })

  const url = new URL(request.url)
  const forceDownload = url.searchParams.get("download") === "1"
  const fileBaseName = sanitizeFilename(
    `${dc3.dc3Folio}-${constancia.empleado.nombre}-${constancia.empleado.apellido}`
  )

  return new Response(dc3.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${fileBaseName || "dc3"}.html"`,
      "Cache-Control": "no-store",
    },
  })
}
