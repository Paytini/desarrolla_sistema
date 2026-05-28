"use server"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

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

  return { ok: true }
}
