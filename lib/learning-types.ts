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
}

export type PortalPackageCourseRecord = {
  id?: number
  paquete_id?: number
  wp_curso_id: number
  nombre_curso: string
}
