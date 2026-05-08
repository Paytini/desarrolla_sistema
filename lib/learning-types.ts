export type PortalCourseRecord = {
  id: number
  empleado_id: number
  wp_curso_id: number
  nombre_curso: string
  progreso_pct: number
  completado: boolean
  acceso_estado: string
  acceso_origen: string | null
  acceso_error: string | null
  ultimo_intento_acceso: Date | null
  fecha_inicio_curso: Date | null
  fecha_completado: Date | null
  ultima_sincronizacion: Date
}

export type PortalCertificateRecord = {
  id: number
  empleado_id: number
  wp_curso_id: number
  nombre_curso: string
  folio: string
  wp_cert_url: string | null
  fecha_emision: Date
  canva_estado: string | null
  canva_design_id: string | null
  canva_design_url: string | null
  canva_edit_url: string | null
  canva_export_url: string | null
  canva_export_expires_at: Date | null
  canva_generada_at: Date | null
  canva_error: string | null
}
