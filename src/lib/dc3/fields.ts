export type Dc3MetadataView = {
  wp_course_id: number
  course_name: string | null
  duration_hours: number | null
  subject_area_name: string | null
  subject_area_code: string | null
  training_agent_name: string | null
  training_agent_registration: string | null
  instructor_name: string | null
  instructor_signature_url: string | null
  grants_dc3: boolean
  source: string
  last_synced_at: Date | null
}

export function getDc3MissingFields(metadata: Dc3MetadataView | undefined) {
  if (metadata?.grants_dc3 === false) return []

  const missing: string[] = []
  if (!metadata?.duration_hours) missing.push("duración")
  if (!metadata?.subject_area_name) missing.push("área temática")
  if (!metadata?.training_agent_name) missing.push("agente capacitador")
  if (!metadata?.instructor_name) missing.push("instructor")
  if (!metadata?.instructor_signature_url) missing.push("firma")
  return missing
}
