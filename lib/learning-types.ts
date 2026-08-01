export type PortalCourseRecord = {
  id: number
  employee_id: number
  wp_course_id: number
  course_name: string
  progress_pct: number
  completed: boolean
  access_status: string
  access_source: string | null
  access_error: string | null
  last_access_attempt: Date | null
  course_start_date: Date | null
  completed_at: Date | null
  last_synced_at: Date
}

export type PortalCertificateRecord = {
  id: number
  employee_id: number
  wp_course_id: number
  course_name: string
  reference_number: string
  certificate_url: string | null
  issued_at: Date
}

export type PortalPackageCourseRecord = {
  id?: number
  package_id?: number
  wp_course_id: number
  course_name: string
  cover_url?: string | null
}
