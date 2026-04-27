"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { syncCompanyPackageEnrollments } from "@/lib/course-sync"
import { prisma } from "@/lib/prisma"
import {
  bridgeCreateBundle,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function getInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : NaN
}

function getSyncErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : "No fue posible sincronizar el paquete con la empresa."
  const normalizedMessage = rawMessage.toLowerCase()

  if (rawMessage.includes("status 404")) {
    return "El plugin de WordPress no tiene el endpoint nuevo de confirmacion de acceso. Actualiza el plugin Desarrolla360 Bridge en WordPress y vuelve a intentar."
  }

  if (rawMessage.includes("status 401") || normalizedMessage.includes("credenciales insuficientes")) {
    return "El bridge de WordPress rechazo la autenticacion. Revisa WP_BRIDGE_PORTAL_KEY y la configuracion del plugin en WordPress."
  }

  if (normalizedMessage.includes("service user")) {
    return "El plugin de WordPress no tiene configurado un Service User ID valido para Tutor LMS."
  }

  if (normalizedMessage.includes("no devolvio una matricula")) {
    return "Tutor LMS no encontro una matricula valida para el alumno despues de inscribirlo. Revisa si el curso requiere otro flujo de acceso."
  }

  if (normalizedMessage.includes("no tienes permisos para hacer eso")) {
    return "Tutor LMS rechazo la confirmacion de acceso del alumno. Actualiza el plugin Desarrolla360 Bridge en WordPress y configura `Tutor API Key` y `Tutor API Secret` en `Settings > Desarrolla360 Bridge` o mediante `D360_TUTOR_API_KEY` y `D360_TUTOR_API_SECRET` en `wp-config.php`."
  }

  return rawMessage.slice(0, 500)
}

function getBundleErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : "No fue posible crear el bundle en Tutor LMS."
  const normalizedMessage = rawMessage.toLowerCase()

  if (normalizedMessage.includes("wp bridge base url")) {
    return "El bridge de WordPress no esta configurado en el portal. Revisa WP_BRIDGE_BASE_URL y WP_BRIDGE_PORTAL_KEY."
  }

  if (normalizedMessage.includes("course bundle addon") || normalizedMessage.includes("bundle addon")) {
    return "En WordPress no esta activo el addon oficial Course Bundle de Tutor LMS. Activalo y vuelve a intentar."
  }

  if (normalizedMessage.includes("post type") && normalizedMessage.includes("bundle")) {
    return "El bridge no pudo detectar el tipo de contenido de bundles en Tutor LMS. Revisa que el addon Course Bundle este activo."
  }

  if (normalizedMessage.includes("credenciales insuficientes") || rawMessage.includes("status 401")) {
    return "El bridge de WordPress rechazo la autenticacion al intentar crear el bundle. Revisa WP_BRIDGE_PORTAL_KEY y la configuracion del plugin."
  }

  return rawMessage.slice(0, 500)
}

export async function createPackageAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const nombre = getString(formData, "nombre")
  const descripcion = getString(formData, "descripcion")
  const modoEntrega = getString(formData, "modo_entrega") || "DIRECT_ENROLLMENT"
  const wpBundleIdRaw = getString(formData, "wp_bundle_id")
  const nombreBundle = getString(formData, "nombre_bundle")
  const notasOperativas = getString(formData, "notas_operativas")
  const selectedCoursesRaw = getString(formData, "selected_courses_json")

  if (!nombre || !selectedCoursesRaw) {
    redirect("/superadmin/paquetes?error=datos")
  }

  let parsedCourses: Array<{ wpCourseId: number; nombreCurso: string }> = []

  try {
    const payload = JSON.parse(selectedCoursesRaw) as Array<{
      wp_course_id?: number
      nombre_curso?: string
    }>

    parsedCourses = payload
      .map((course) => ({
        wpCourseId: Number(course.wp_course_id),
        nombreCurso: String(course.nombre_curso ?? "").trim(),
      }))
      .filter((course) => Number.isInteger(course.wpCourseId) && course.nombreCurso)
  } catch {
    redirect("/superadmin/paquetes?error=cursos")
  }

  if (parsedCourses.length === 0) {
    redirect("/superadmin/paquetes?error=cursos")
  }

  const wpBundleId = wpBundleIdRaw ? Number.parseInt(wpBundleIdRaw, 10) : NaN
  let resolvedBundleId = Number.isInteger(wpBundleId) ? wpBundleId : null
  let resolvedBundleName = nombreBundle || null

  if (!resolvedBundleId) {
    if (!isWordPressBridgeConfigured()) {
      const detail = encodeURIComponent(
        "Configura el bridge de WordPress para que el paquete pueda crear su bundle automaticamente en Tutor LMS."
      )
      redirect(`/superadmin/paquetes?error=bundle&detail=${detail}`)
    }

    try {
      const bundle = await bridgeCreateBundle({
        title: nombre,
        description: descripcion || "",
        courseIds: parsedCourses.map((course) => course.wpCourseId),
        visibility: "private",
      })

      resolvedBundleId = bundle.bundle_id
      resolvedBundleName = bundle.title
    } catch (error) {
      const detail = encodeURIComponent(getBundleErrorMessage(error))
      redirect(`/superadmin/paquetes?error=bundle&detail=${detail}`)
    }
  }

  const paquete = await prisma.paquete.create({
    data: {
      nombre,
      descripcion: descripcion || null,
      modo_entrega: modoEntrega || "DIRECT_ENROLLMENT",
      wp_bundle_id: resolvedBundleId,
      nombre_bundle: resolvedBundleName,
      notas_operativas: notasOperativas || null,
      activo: true,
      cursos: {
        create: parsedCourses.map((course) => ({
          wp_curso_id: course.wpCourseId,
          nombre_curso: course.nombreCurso,
        })),
      },
    },
  })

  await createAuditEvent({
    actor,
    accion: "PAQUETE_CREADO",
    entidadTipo: "PAQUETE",
    entidadId: paquete.id,
    resumen: `${actor.nombre} creo el paquete ${nombre}.`,
    metadata: {
      modo_entrega: modoEntrega || "DIRECT_ENROLLMENT",
      cursos: parsedCourses.map((course) => ({
        wp_curso_id: course.wpCourseId,
        nombre_curso: course.nombreCurso,
      })),
      wp_bundle_id: resolvedBundleId,
      nombre_bundle: resolvedBundleName,
    },
  })

  revalidatePath("/superadmin/paquetes")
  revalidatePath("/superadmin/reportes")
  redirect("/superadmin/paquetes?success=paquete_creado")
}

export async function assignPackageToCompanyAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const empresaId = getInteger(getString(formData, "empresa_id"))
  const paqueteId = getInteger(getString(formData, "paquete_id"))
  const fechaVencimientoRaw = getString(formData, "fecha_vencimiento")

  if (!empresaId || !paqueteId) {
    redirect("/superadmin/paquetes?error=asignacion")
  }

  await prisma.$transaction([
    prisma.empresaPaquete.updateMany({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      data: {
        activo: false,
      },
    }),
    prisma.empresaPaquete.create({
      data: {
        empresa_id: empresaId,
        paquete_id: paqueteId,
        activo: true,
        fecha_vencimiento: fechaVencimientoRaw ? new Date(fechaVencimientoRaw) : null,
      },
    }),
  ])

  const [empresa, paquete] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nombre: true },
    }),
    prisma.paquete.findUnique({
      where: { id: paqueteId },
      select: { nombre: true },
    }),
  ])

  await createAuditEvent({
    actor,
    accion: "PAQUETE_ASIGNADO",
    entidadTipo: "EMPRESA_PAQUETE",
    entidadId: paqueteId,
    empresaId,
    resumen: `${actor.nombre} asigno ${paquete?.nombre ?? "un paquete"} a ${empresa?.nombre ?? "una empresa"}.`,
    metadata: {
      empresa_id: empresaId,
      paquete_id: paqueteId,
      fecha_vencimiento: fechaVencimientoRaw || null,
    },
  })

  revalidatePath("/superadmin/paquetes")
  revalidatePath("/superadmin/empresas")
  revalidatePath("/superadmin/reportes")
  revalidatePath("/empresa/inicio")
  revalidatePath("/empresa/empleados")
  redirect("/superadmin/paquetes?success=paquete_asignado")
}

export async function syncPackageToCompanyEmployeesAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const empresaId = getInteger(getString(formData, "empresa_id"))
  if (!empresaId) {
    redirect("/superadmin/paquetes?error=sync")
  }

  try {
    await syncCompanyPackageEnrollments(empresaId)
  } catch (error) {
    await createAuditEvent({
      actor,
      accion: "SYNC_PAQUETE_EMPRESA_ERROR",
      entidadTipo: "EMPRESA",
      entidadId: empresaId,
      empresaId,
      resumen: `${actor.nombre} intento sincronizar paquete y hubo error.`,
      metadata: {
        message: getSyncErrorMessage(error),
      },
    })
    const detail = encodeURIComponent(getSyncErrorMessage(error))
    redirect(`/superadmin/paquetes?error=sync&detail=${detail}`)
  }

  await createAuditEvent({
    actor,
    accion: "SYNC_PAQUETE_EMPRESA_OK",
    entidadTipo: "EMPRESA",
    entidadId: empresaId,
    empresaId,
    resumen: `${actor.nombre} sincronizo paquete activo con empleados de la empresa.`,
  })

  revalidatePath("/superadmin/paquetes")
  revalidatePath("/superadmin/reportes")
  revalidatePath("/empresa/empleados")
  revalidatePath("/empresa/progreso")
  revalidatePath("/empleado/cursos")
  redirect("/superadmin/paquetes?success=sync_ok")
}
