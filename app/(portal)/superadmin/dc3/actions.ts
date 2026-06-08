"use server"

import { revalidateTag } from "next/cache"
import { SUPERADMIN_DC3_TAG, SUPERADMIN_GLOBAL_TAG } from "@/lib/cache-tags"
import { decodeHtmlEntities } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import {
  bridgeGetCourseDetails,
  isWordPressBridgeConfigured,
} from "@/lib/wordpress-bridge"

function preferBridgeValue(
  incoming: string | number | null | undefined,
  current: string | number | null | undefined
) {
  if (typeof incoming === "number" && Number.isFinite(incoming)) {
    return incoming
  }

  if (typeof incoming === "string" && incoming.trim()) {
    return incoming.trim()
  }

  return current ?? null
}

export async function saveDc3MetadataAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") {
    return { ok: false, error: "No autorizado" }
  }

  const wpCursoId = Number(formData.get("wp_curso_id"))
  if (!Number.isInteger(wpCursoId) || wpCursoId <= 0) {
    return { ok: false, error: "ID de curso inválido" }
  }

  const nombreCurso = (formData.get("nombre_curso") as string)?.trim() || null
  const duracionRaw = formData.get("duracion_horas") as string
  const duracionHoras = duracionRaw ? parseFloat(duracionRaw) : null
  const areaNombre = (formData.get("area_tematica_nombre") as string)?.trim() || null
  const areaClave = (formData.get("area_tematica_clave") as string)?.trim() || null
  const agenteNombre = (formData.get("agente_capacitador_nombre") as string)?.trim() || null
  const agenteRegistro = (formData.get("agente_capacitador_registro") as string)?.trim() || null
  const instructorNombre = (formData.get("instructor_nombre") as string)?.trim() || null
  const firmaUrl = (formData.get("firma_url") as string)?.trim() || null

  await prisma.cursoDc3Metadata.upsert({
    where: { wp_curso_id: wpCursoId },
    create: {
      wp_curso_id: wpCursoId,
      nombre_curso: nombreCurso,
      duracion_horas: duracionHoras,
      area_tematica_nombre: areaNombre,
      area_tematica_clave: areaClave,
      agente_capacitador_nombre: agenteNombre,
      agente_capacitador_registro: agenteRegistro,
      instructor_nombre: instructorNombre,
      instructor_firma_url: firmaUrl,
      fuente: "MANUAL",
      ultima_sincronizacion: new Date(),
    },
    update: {
      nombre_curso: nombreCurso,
      duracion_horas: duracionHoras,
      area_tematica_nombre: areaNombre,
      area_tematica_clave: areaClave,
      agente_capacitador_nombre: agenteNombre,
      agente_capacitador_registro: agenteRegistro,
      instructor_nombre: instructorNombre,
      instructor_firma_url: firmaUrl,
      fuente: "MANUAL",
      ultima_sincronizacion: new Date(),
    },
  })

  revalidateTag(SUPERADMIN_DC3_TAG, "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  return { ok: true }
}

export async function syncDc3MetadataAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.user.rol !== "SUPERADMIN") {
    return { ok: false, error: "No autorizado" }
  }

  const wpCursoId = Number(formData.get("wp_curso_id"))
  if (!Number.isInteger(wpCursoId) || wpCursoId <= 0) {
    return { ok: false, error: "ID de curso inválido" }
  }

  const nombreCurso = (formData.get("nombre_curso") as string)?.trim() || ""

  if (!isWordPressBridgeConfigured()) {
    return {
      ok: false,
      error: "Configura WP_BRIDGE_BASE_URL y WP_BRIDGE_PORTAL_KEY para leer datos del curso.",
    }
  }

  try {
    const [details, existingMetadata] = await Promise.all([
      bridgeGetCourseDetails(wpCursoId),
      prisma.cursoDc3Metadata.findUnique({
        where: { wp_curso_id: wpCursoId },
      }),
    ])

    await prisma.cursoDc3Metadata.upsert({
      where: { wp_curso_id: wpCursoId },
      update: {
        nombre_curso: decodeHtmlEntities(details.title || nombreCurso || existingMetadata?.nombre_curso || "") || null,
        duracion_horas: preferBridgeValue(
          details.duration_hours,
          existingMetadata?.duracion_horas
        ) as number | null,
        area_tematica_nombre: preferBridgeValue(
          details.thematic_area_name,
          existingMetadata?.area_tematica_nombre
        ) as string | null,
        area_tematica_clave: preferBridgeValue(
          details.thematic_area_code,
          existingMetadata?.area_tematica_clave
        ) as string | null,
        agente_capacitador_nombre: preferBridgeValue(
          details.training_agent_name,
          existingMetadata?.agente_capacitador_nombre
        ) as string | null,
        agente_capacitador_registro: preferBridgeValue(
          details.training_agent_registry,
          existingMetadata?.agente_capacitador_registro
        ) as string | null,
        instructor_nombre: preferBridgeValue(
          details.instructor_name,
          existingMetadata?.instructor_nombre
        ) as string | null,
        instructor_firma_url: preferBridgeValue(
          details.instructor_signature_url,
          existingMetadata?.instructor_firma_url
        ) as string | null,
        fuente: "WORDPRESS_BRIDGE",
        ultima_sincronizacion: new Date(),
      },
      create: {
        wp_curso_id: wpCursoId,
        nombre_curso: decodeHtmlEntities(details.title || nombreCurso || "") || null,
        duracion_horas: details.duration_hours ?? null,
        area_tematica_nombre: details.thematic_area_name || null,
        area_tematica_clave: details.thematic_area_code || null,
        agente_capacitador_nombre: details.training_agent_name || null,
        agente_capacitador_registro: details.training_agent_registry || null,
        instructor_nombre: details.instructor_name || null,
        instructor_firma_url: details.instructor_signature_url || null,
        fuente: "WORDPRESS_BRIDGE",
        ultima_sincronizacion: new Date(),
      },
    })
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message.slice(0, 500)
          : "No fue posible leer el curso desde WordPress.",
    }
  }

  revalidateTag(SUPERADMIN_DC3_TAG, "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  return { ok: true }
}
