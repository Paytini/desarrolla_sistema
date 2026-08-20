"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { createAuditEvent, getAuditActorFromSession } from "@/lib/auditing"
import { requireSuperAdminSession } from "@/lib/auth-guards"
import { SUPERADMIN_GLOBAL_TAG, companyCacheRootTag } from "@/lib/cache-tags"
import { getCompanyBranding } from "@/lib/company-branding"
import { companyPath } from "@/lib/company-routes"
import { enqueuePackageEnrollmentSyncJob } from "@/lib/course-sync"
import { decodeHtmlEntities } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { isUuid } from "@/lib/uuid"
import {
  bridgeCreateBundle,
  bridgeUpdateBundle,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function getSyncErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : "No fue posible sincronizar el paquete con la empresa."
  const normalizedMessage = rawMessage.toLowerCase()

  if (rawMessage.includes("status 404")) {
    return "El plugin de WordPress no tiene el endpoint nuevo de confirmacion de acceso. Actualiza el plugin Desarrolla360 Bridge en WordPress y vuelve a intentar."
  }

  if (
    rawMessage.includes("status 401") ||
    normalizedMessage.includes("credenciales insuficientes")
  ) {
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
    error instanceof Error ? error.message : "No fue posible crear el bundle en Tutor LMS."
  const normalizedMessage = rawMessage.toLowerCase()

  if (normalizedMessage.includes("wp bridge base url")) {
    return "El bridge de WordPress no esta configurado en el portal. Revisa WP_BRIDGE_BASE_URL y WP_BRIDGE_PORTAL_KEY."
  }

  if (
    normalizedMessage.includes("course bundle addon") ||
    normalizedMessage.includes("bundle addon")
  ) {
    return "En WordPress no esta activo el addon oficial Course Bundle de Tutor LMS. Activalo y vuelve a intentar."
  }

  if (normalizedMessage.includes("post type") && normalizedMessage.includes("bundle")) {
    return "El bridge no pudo detectar el tipo de contenido de bundles en Tutor LMS. Revisa que el addon Course Bundle este activo."
  }

  if (
    normalizedMessage.includes("credenciales insuficientes") ||
    rawMessage.includes("status 401")
  ) {
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
    redirect("/superadmin/packages/new?error=datos")
  }

  let parsedCourses: Array<{ wpCourseId: number; nombreCurso: string; portadaUrl: string | null }> =
    []

  try {
    const payload = JSON.parse(selectedCoursesRaw) as Array<{
      wp_course_id?: number
      nombre_curso?: string
      portada_url?: string | null
    }>

    parsedCourses = payload
      .map((course) => ({
        wpCourseId: Number(course.wp_course_id),
        nombreCurso: decodeHtmlEntities(String(course.nombre_curso ?? "").trim()),
        portadaUrl: course.portada_url ? String(course.portada_url) : null,
      }))
      .filter((course) => Number.isInteger(course.wpCourseId) && course.nombreCurso)
  } catch {
    redirect("/superadmin/packages/new?error=cursos")
  }

  if (parsedCourses.length === 0) {
    redirect("/superadmin/packages/new?error=cursos")
  }

  const wpBundleId = wpBundleIdRaw ? Number.parseInt(wpBundleIdRaw, 10) : NaN
  let resolvedBundleId = Number.isInteger(wpBundleId) ? wpBundleId : null
  let resolvedBundleName = nombreBundle || null

  if (!resolvedBundleId) {
    if (!isWordPressBridgeConfigured()) {
      const detail = encodeURIComponent(
        "Configura el bridge de WordPress para que el paquete pueda crear su bundle automaticamente en Tutor LMS.",
      )
      redirect(`/superadmin/packages/new?error=bundle&detail=${detail}`)
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
      redirect(`/superadmin/packages/new?error=bundle&detail=${detail}`)
    }
  }

  const pkg = await prisma.package.create({
    data: {
      name: nombre,
      description: descripcion || null,
      delivery_mode: modoEntrega || "DIRECT_ENROLLMENT",
      wp_bundle_id: resolvedBundleId,
      bundle_name: resolvedBundleName,
      operational_notes: notasOperativas || null,
      active: true,
      courses: {
        create: parsedCourses.map((course) => ({
          wp_course_id: course.wpCourseId,
          course_name: course.nombreCurso,
          cover_url: course.portadaUrl,
        })),
      },
    },
  })

  await createAuditEvent({
    actor,
    accion: "PAQUETE_CREADO",
    entityType: "PAQUETE",
    entityId: pkg.id,
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

  revalidatePath("/superadmin/packages")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/superadmin/packages?success=paquete_creado")
}

export async function updatePackageAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const packageId = getString(formData, "package_id")
  const nombre = getString(formData, "nombre")
  const descripcion = getString(formData, "descripcion")
  const modoEntrega = getString(formData, "modo_entrega") || "DIRECT_ENROLLMENT"
  const wpBundleIdRaw = getString(formData, "wp_bundle_id")
  const nombreBundle = getString(formData, "nombre_bundle")
  const notasOperativas = getString(formData, "notas_operativas")
  const selectedCoursesRaw = getString(formData, "selected_courses_json")

  if (!packageId || !isUuid(packageId)) {
    redirect("/superadmin/packages?error=paquete")
  }

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      active: true,
      wp_bundle_id: true,
      courses: {
        select: { id: true, wp_course_id: true, course_name: true, cover_url: true },
      },
    },
  })

  if (!pkg || !pkg.active) {
    redirect("/superadmin/packages?error=paquete")
  }

  if (!nombre || !selectedCoursesRaw) {
    redirect(`/superadmin/packages/${packageId}/edit?error=datos`)
  }

  let parsedCourses: Array<{ wpCourseId: number; nombreCurso: string; portadaUrl: string | null }> =
    []

  try {
    const payload = JSON.parse(selectedCoursesRaw) as Array<{
      wp_course_id?: number
      nombre_curso?: string
      portada_url?: string | null
    }>

    parsedCourses = payload
      .map((course) => ({
        wpCourseId: Number(course.wp_course_id),
        nombreCurso: decodeHtmlEntities(String(course.nombre_curso ?? "").trim()),
        portadaUrl: course.portada_url ? String(course.portada_url) : null,
      }))
      .filter((course) => Number.isInteger(course.wpCourseId) && course.nombreCurso)
  } catch {
    redirect(`/superadmin/packages/${packageId}/edit?error=cursos`)
  }

  if (parsedCourses.length === 0) {
    redirect(`/superadmin/packages/${packageId}/edit?error=cursos`)
  }

  const hadExistingBundle = Boolean(pkg.wp_bundle_id)
  let resolvedBundleId = pkg.wp_bundle_id
  let resolvedBundleName = nombreBundle || null

  if (!resolvedBundleId) {
    const wpBundleId = wpBundleIdRaw ? Number.parseInt(wpBundleIdRaw, 10) : NaN
    resolvedBundleId = Number.isInteger(wpBundleId) ? wpBundleId : null
  }

  if (!resolvedBundleId) {
    if (!isWordPressBridgeConfigured()) {
      const detail = encodeURIComponent(
        "Configura el bridge de WordPress para que el paquete pueda crear su bundle automaticamente en Tutor LMS.",
      )
      redirect(`/superadmin/packages/${packageId}/edit?error=bundle&detail=${detail}`)
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
      redirect(`/superadmin/packages/${packageId}/edit?error=bundle&detail=${detail}`)
    }
  } else if (hadExistingBundle) {
    try {
      await bridgeUpdateBundle({
        bundleId: resolvedBundleId,
        title: nombre,
        description: descripcion || "",
        courseIds: parsedCourses.map((course) => course.wpCourseId),
      })
    } catch (error) {
      const detail = encodeURIComponent(getBundleErrorMessage(error))
      redirect(`/superadmin/packages/${packageId}/edit?error=bundle&detail=${detail}`)
    }
  }

  const existingByWpCourseId = new Map(pkg.courses.map((course) => [course.wp_course_id, course]))
  const nextWpCourseIds = new Set(parsedCourses.map((course) => course.wpCourseId))

  const coursesToDelete = pkg.courses.filter((course) => !nextWpCourseIds.has(course.wp_course_id))
  const coursesToCreate = parsedCourses.filter(
    (course) => !existingByWpCourseId.has(course.wpCourseId),
  )
  const coursesToUpdate = parsedCourses.filter((course) => {
    const existing = existingByWpCourseId.get(course.wpCourseId)
    if (!existing) return false
    return existing.course_name !== course.nombreCurso || existing.cover_url !== course.portadaUrl
  })

  await prisma.$transaction([
    prisma.package.update({
      where: { id: packageId },
      data: {
        name: nombre,
        description: descripcion || null,
        delivery_mode: modoEntrega || "DIRECT_ENROLLMENT",
        wp_bundle_id: resolvedBundleId,
        bundle_name: resolvedBundleName,
        operational_notes: notasOperativas || null,
      },
    }),
    ...(coursesToDelete.length > 0
      ? [
          prisma.packageCourse.deleteMany({
            where: { id: { in: coursesToDelete.map((course) => course.id) } },
          }),
        ]
      : []),
    ...coursesToUpdate.map((course) =>
      prisma.packageCourse.update({
        where: {
          package_id_wp_course_id: { package_id: packageId, wp_course_id: course.wpCourseId },
        },
        data: { course_name: course.nombreCurso, cover_url: course.portadaUrl },
      }),
    ),
    ...(coursesToCreate.length > 0
      ? [
          prisma.packageCourse.createMany({
            data: coursesToCreate.map((course) => ({
              package_id: packageId,
              wp_course_id: course.wpCourseId,
              course_name: course.nombreCurso,
              cover_url: course.portadaUrl,
            })),
          }),
        ]
      : []),
  ])

  await createAuditEvent({
    actor,
    accion: "PAQUETE_ACTUALIZADO",
    entityType: "PAQUETE",
    entityId: packageId,
    resumen: `${actor.nombre} actualizo el paquete ${nombre}.`,
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

  revalidatePath("/superadmin/packages")
  revalidatePath("/superadmin/reports")
  // Editing a package's catalog can affect any company subscribed to it, not just
  // one — revalidate every /company/[slug]/* page via the shared layout instead
  // of picking a single company.
  revalidatePath(companyPath("[slug]", "/home"), "layout")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/superadmin/packages?success=paquete_actualizado")
}

export async function deletePackageAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)
  const packageId = getString(formData, "paquete_id")

  if (!packageId || !isUuid(packageId)) {
    redirect("/superadmin/packages?error=paquete")
  }

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      name: true,
      active: true,
      companies: {
        where: { active: true },
        select: {
          company_id: true,
          company: {
            select: { name: true },
          },
        },
      },
    },
  })

  if (!pkg || !pkg.active) {
    redirect("/superadmin/packages?error=paquete")
  }

  if (pkg.companies.length > 0) {
    const companyNames = pkg.companies.map((assignment) => assignment.company.name).join(", ")
    const detail = encodeURIComponent(
      `Primero cambia o desactiva el paquete activo en: ${companyNames}.`,
    )
    redirect(`/superadmin/packages?error=paquete_asignado&detail=${detail}`)
  }

  await prisma.package.update({
    where: { id: pkg.id },
    data: { active: false },
  })

  await createAuditEvent({
    actor,
    accion: "PAQUETE_ELIMINADO",
    entityType: "PAQUETE",
    entityId: pkg.id,
    resumen: `${actor.nombre} elimino el paquete ${pkg.name}.`,
    metadata: {
      baja_logica: true,
    },
  })

  revalidatePath("/superadmin/packages")
  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  redirect("/superadmin/packages?success=paquete_eliminado")
}

export async function assignPackageToCompanyAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const companyId = getString(formData, "empresa_id")
  const packageId = getString(formData, "paquete_id")
  const expirationDateRaw = getString(formData, "fecha_vencimiento")

  if (!companyId || !packageId || !isUuid(companyId) || !isUuid(packageId)) {
    redirect("/superadmin/packages?error=asignacion")
  }

  await prisma.$transaction([
    prisma.companyPackage.updateMany({
      where: {
        company_id: companyId,
        active: true,
      },
      data: {
        active: false,
      },
    }),
    prisma.companyPackage.create({
      data: {
        company_id: companyId,
        package_id: packageId,
        active: true,
        expiration_date: (() => {
          if (!expirationDateRaw) return null
          const d = new Date(expirationDateRaw)
          return isNaN(d.getTime()) ? null : d
        })(),
      },
    }),
  ])

  const [company, pkg] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }),
    prisma.package.findUnique({
      where: { id: packageId },
      select: { name: true },
    }),
  ])

  await createAuditEvent({
    actor,
    accion: "PAQUETE_ASIGNADO",
    entityType: "EMPRESA_PAQUETE",
    entityId: packageId,
    companyId,
    resumen: `${actor.nombre} asigno ${pkg?.name ?? "un paquete"} a ${company?.name ?? "una empresa"}.`,
    metadata: {
      empresa_id: companyId,
      paquete_id: packageId,
      fecha_vencimiento: expirationDateRaw || null,
    },
  })

  const assignedCompanyBranding = await getCompanyBranding(companyId)

  revalidatePath("/superadmin/packages")
  revalidatePath("/superadmin/companies")
  revalidatePath("/superadmin/reports")
  if (assignedCompanyBranding) {
    revalidatePath(companyPath(assignedCompanyBranding.slug, "/home"))
    revalidatePath(companyPath(assignedCompanyBranding.slug, "/employees"))
  }
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(companyId), "max")
  redirect("/superadmin/packages?success=paquete_asignado")
}

export async function syncPackageToCompanyEmployeesAction(formData: FormData) {
  const session = await requireSuperAdminSession()
  const actor = getAuditActorFromSession(session)

  const companyId = getString(formData, "empresa_id")
  if (!companyId || !isUuid(companyId)) {
    redirect("/superadmin/packages?error=sync")
  }

  let employeeCount = 0

  try {
    const queued = await enqueuePackageEnrollmentSyncJob(companyId)
    employeeCount = queued.employeeCount
  } catch (error) {
    await createAuditEvent({
      actor,
      accion: "SYNC_PAQUETE_EMPRESA_ERROR",
      entityType: "EMPRESA",
      entityId: companyId,
      companyId,
      resumen: `${actor.nombre} intento encolar sincronizacion de paquete y hubo error.`,
      metadata: {
        message: getSyncErrorMessage(error),
      },
    })
    const detail = encodeURIComponent(getSyncErrorMessage(error))
    redirect(`/superadmin/packages?error=sync&detail=${detail}`)
  }

  await createAuditEvent({
    actor,
    accion: "SYNC_PAQUETE_EMPRESA_ENCOLADO",
    entityType: "EMPRESA",
    entityId: companyId,
    companyId,
    resumen: `${actor.nombre} encolo sincronizacion de paquete activo para ${employeeCount} empleados.`,
  })

  const syncedCompanyBranding = await getCompanyBranding(companyId)

  revalidatePath("/superadmin/packages")
  revalidatePath("/superadmin/reports")
  if (syncedCompanyBranding) {
    revalidatePath(companyPath(syncedCompanyBranding.slug, "/employees"))
    revalidatePath(companyPath(syncedCompanyBranding.slug, "/progress"))
  }
  revalidatePath("/employee/courses")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")
  revalidateTag(companyCacheRootTag(companyId), "max")
  redirect("/superadmin/packages?success=sync_queued")
}
