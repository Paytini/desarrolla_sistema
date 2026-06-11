export type Dc3MetadataView = {
  wp_curso_id: number
  nombre_curso: string | null
  duracion_horas: number | null
  area_tematica_nombre: string | null
  area_tematica_clave: string | null
  agente_capacitador_nombre: string | null
  agente_capacitador_registro: string | null
  instructor_nombre: string | null
  instructor_firma_url: string | null
  fuente: string
  ultima_sincronizacion: Date | null
}

export function getDc3MissingFields(metadata: Dc3MetadataView | undefined) {
  const missing: string[] = []
  if (!metadata?.duracion_horas) missing.push("duración")
  if (!metadata?.area_tematica_nombre) missing.push("área temática")
  if (!metadata?.agente_capacitador_nombre) missing.push("agente capacitador")
  if (!metadata?.instructor_nombre) missing.push("instructor")
  if (!metadata?.instructor_firma_url) missing.push("firma")
  return missing
}
