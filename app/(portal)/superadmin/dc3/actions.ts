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
  if (!session || session.user.role !== "SUPERADMIN") {
    return { ok: false, error: "No autorizado" }
  }

  const wpCourseId = Number(formData.get("wp_curso_id"))
  if (!Number.isInteger(wpCourseId) || wpCourseId <= 0) {
    return { ok: false, error: "ID de curso inválido" }
  }

  const courseName = (formData.get("nombre_curso") as string)?.trim() || null
  const durationRaw = formData.get("duracion_horas") as string
  const durationHours = durationRaw ? parseFloat(durationRaw) : null
  const thematicAreaName = (formData.get("area_tematica_nombre") as string)?.trim() || null
  const thematicAreaCode = (formData.get("area_tematica_clave") as string)?.trim() || null
  const trainingAgentName = (formData.get("agente_capacitador_nombre") as string)?.trim() || null
  const trainingAgentRegistry = (formData.get("agente_capacitador_registro") as string)?.trim() || null
  const instructorName = (formData.get("instructor_nombre") as string)?.trim() || null
  const signatureUrl = (formData.get("firma_url") as string)?.trim() || null

  if (!signatureUrl) {
    return { ok: false, error: "La firma del instructor es obligatoria" }
  }

  await prisma.courseDc3Metadata.upsert({
    where: { wp_course_id: wpCourseId },
    create: {
      wp_course_id: wpCourseId,
      course_name: courseName,
      duration_hours: durationHours,
      subject_area_name: thematicAreaName,
      subject_area_code: thematicAreaCode,
      training_agent_name: trainingAgentName,
      training_agent_registration: trainingAgentRegistry,
      instructor_name: instructorName,
      instructor_signature_url: signatureUrl,
      source: "MANUAL",
      last_synced_at: new Date(),
    },
    update: {
      course_name: courseName,
      duration_hours: durationHours,
      subject_area_name: thematicAreaName,
      subject_area_code: thematicAreaCode,
      training_agent_name: trainingAgentName,
      training_agent_registration: trainingAgentRegistry,
      instructor_name: instructorName,
      instructor_signature_url: signatureUrl,
      source: "MANUAL",
      last_synced_at: new Date(),
    },
  })

  await prisma.certificate.updateMany({
    where: { wp_course_id: wpCourseId },
    data: { dc3_pdf_url: null },
  })

  revalidateTag(SUPERADMIN_DC3_TAG, "max")
  revalidateTag(SUPERADMIN_GLOBAL_TAG, "max")

  return { ok: true }
}

export async function syncDc3MetadataAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.user.role !== "SUPERADMIN") {
    return { ok: false, error: "No autorizado" }
  }

  const wpCourseId = Number(formData.get("wp_curso_id"))
  if (!Number.isInteger(wpCourseId) || wpCourseId <= 0) {
    return { ok: false, error: "ID de curso inválido" }
  }

  const courseName = (formData.get("nombre_curso") as string)?.trim() || ""

  if (!isWordPressBridgeConfigured()) {
    return {
      ok: false,
      error: "Configura WP_BRIDGE_BASE_URL y WP_BRIDGE_PORTAL_KEY para leer datos del curso.",
    }
  }

  try {
    const [details, existingMetadata] = await Promise.all([
      bridgeGetCourseDetails(wpCourseId),
      prisma.courseDc3Metadata.findUnique({
        where: { wp_course_id: wpCourseId },
      }),
    ])

    await prisma.courseDc3Metadata.upsert({
      where: { wp_course_id: wpCourseId },
      update: {
        course_name: decodeHtmlEntities(details.title || courseName || existingMetadata?.course_name || "") || null,
        duration_hours: preferBridgeValue(
          details.duration_hours,
          existingMetadata?.duration_hours
        ) as number | null,
        subject_area_name: preferBridgeValue(
          details.thematic_area_name,
          existingMetadata?.subject_area_name
        ) as string | null,
        subject_area_code: preferBridgeValue(
          details.thematic_area_code,
          existingMetadata?.subject_area_code
        ) as string | null,
        training_agent_name: preferBridgeValue(
          details.training_agent_name,
          existingMetadata?.training_agent_name
        ) as string | null,
        training_agent_registration: preferBridgeValue(
          details.training_agent_registry,
          existingMetadata?.training_agent_registration
        ) as string | null,
        instructor_name: preferBridgeValue(
          details.instructor_name,
          existingMetadata?.instructor_name
        ) as string | null,
        instructor_signature_url: preferBridgeValue(
          details.instructor_signature_url,
          existingMetadata?.instructor_signature_url
        ) as string | null,
        source: "WORDPRESS_BRIDGE",
        last_synced_at: new Date(),
      },
      create: {
        wp_course_id: wpCourseId,
        course_name: decodeHtmlEntities(details.title || courseName || "") || null,
        duration_hours: details.duration_hours ?? null,
        subject_area_name: details.thematic_area_name || null,
        subject_area_code: details.thematic_area_code || null,
        training_agent_name: details.training_agent_name || null,
        training_agent_registration: details.training_agent_registry || null,
        instructor_name: details.instructor_name || null,
        instructor_signature_url: details.instructor_signature_url || null,
        source: "WORDPRESS_BRIDGE",
        last_synced_at: new Date(),
      },
    })

    await prisma.certificate.updateMany({
      where: { wp_course_id: wpCourseId },
      data: { dc3_pdf_url: null },
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
