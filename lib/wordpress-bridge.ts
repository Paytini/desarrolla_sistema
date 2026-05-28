import { createHmac } from "node:crypto"

type BridgeHeaders = Record<string, string>

export type BridgeHealthResponse = {
  ok: boolean
  plugin_version: string
  site_url: string
  wordpress_version: string
  tutor_rest_available: boolean
  service_user_configured: boolean
  learning_webhook_configured?: boolean
}

export type BridgeUpsertEmployeeInput = {
  employeeId: number
  companyId: number
  companyName: string
  email: string
  firstName: string
  lastName: string
  password?: string
  department?: string | null
  position?: string | null
}

export type BridgeUpsertEmployeeResponse = {
  wp_user_id: number
  email: string
  created: boolean
  generated_password?: string | null
}

export type BridgeDeleteEmployeeInput = {
  employeeId?: number | null
  wpUserId?: number | null
  email?: string | null
}

export type BridgeDeleteEmployeeResponse = {
  found: boolean
  deleted: boolean
  wp_user_id: number | null
  email: string | null
  enrollment_posts_deleted: number
}

export type BridgeCreateBundleInput = {
  title: string
  description?: string | null
  courseIds: number[]
  visibility?: "private" | "public"
}

export type BridgeCreateBundleResponse = {
  bundle_id: number
  title: string
  post_type: string
  status: string
  visibility: string
  permalink: string
  course_ids: number[]
}

export type BridgeEnrollmentResponse = {
  user_id: number
  enrolled_course_ids: number[]
  failed_course_ids: Array<{
    course_id: number
    message: string
  }>
}

export type BridgeEnsureAccessResponse = {
  student_id: number
  completed_course_ids: number[]
  already_active_ids: number[]
  failed_course_ids: Array<{
    course_id: number
    message: string
  }>
}

export type BridgeStudentCourse = {
  wp_course_id: number
  title: string
  progress_pct: number
  completed: boolean
  started_at?: string | null
  completed_at?: string | null
  certificate_url?: string | null
  raw?: Record<string, unknown>
}

type BridgeStudentCoursesResponse = {
  student_id: number
  courses: BridgeStudentCourse[]
  raw: unknown
}

export type BridgeStudentDiagnosticsResponse = {
  student_id: number
  plugin_version: string
  service_user_id: number
  course_filter?: number | null
  tutor_courses_error?: {
    code?: string
    message?: string
    data?: unknown
  } | null
  tutor_courses_raw: unknown
  tutor_courses_count: number
  direct_courses_count: number
  courses: Array<{
    wp_course_id: number
    title: string
    rest_snapshot?: unknown
    direct_snapshot?: unknown
    calculated?: unknown
    enrollment?: unknown
    certificate?: unknown
  }>
}

export type BridgeStudentCertificate = {
  wp_course_id: number
  title: string
  certificate_url?: string | null
  completed_at?: string | null
}

type BridgeStudentCertificatesResponse = {
  student_id: number
  certificates: BridgeStudentCertificate[]
}

export type BridgeCourseOption = {
  wp_course_id: number
  title: string
  status?: string | null
  post_type?: string | null
  course_url?: string | null
  thumbnail_url?: string | null
}

export type BridgeCourseDetails = {
  wp_course_id: number
  title: string
  status?: string | null
  post_type?: string | null
  course_url?: string | null
  summary?: string | null
  instructor_name?: string | null
  instructor_signature_url?: string | null
  training_agent_name?: string | null
  training_agent_registry?: string | null
  duration_hours?: number | null
  duration_label?: string | null
  thematic_area_name?: string | null
  thematic_area_code?: string | null
  category_names?: string[]
  tutor_course_payload?: Record<string, unknown> | null
}

type BridgeCoursesResponse = {
  courses: BridgeCourseOption[]
  total: number
}

function getBaseUrl() {
  return process.env.WP_BRIDGE_BASE_URL?.replace(/\/$/, "") ?? ""
}

export function getWordPressSiteUrl() {
  const publicSiteUrl = process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL?.replace(/\/$/, "")
  if (publicSiteUrl) {
    return publicSiteUrl
  }

  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return ""
  }

  try {
    const parsedUrl = new URL(baseUrl)
    const sitePath = parsedUrl.pathname.replace(/\/wp-json\/.*$/, "").replace(/\/$/, "")
    return `${parsedUrl.origin}${sitePath}`
  } catch {
    return ""
  }
}

function getPortalSharedKey() {
  return process.env.WP_BRIDGE_PORTAL_KEY?.trim() ?? ""
}

function normalizeLaunchRedirect(courseUrl: string) {
  const siteUrl = getWordPressSiteUrl()
  if (!siteUrl) {
    return ""
  }

  try {
    const site = new URL(siteUrl)
    const course = new URL(courseUrl)
    if (site.origin !== course.origin) {
      return ""
    }

    return `${course.pathname}${course.search}${course.hash}`
  } catch {
    return ""
  }
}

export function buildWordPressCourseLaunchUrl(params: {
  wpUserId: number | null | undefined
  courseUrl: string | null | undefined
}) {
  const siteUrl = getWordPressSiteUrl()
  const portalKey = getPortalSharedKey()
  const wpUserId = Number(params.wpUserId ?? 0)
  const courseUrl = params.courseUrl?.trim() ?? ""

  if (!siteUrl || !portalKey || !wpUserId || !courseUrl) {
    return null
  }

  const redirectPath = normalizeLaunchRedirect(courseUrl)
  if (!redirectPath) {
    return null
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 5
  const payload = `${wpUserId}|${expiresAt}|${redirectPath}`
  const signature = createHmac("sha256", portalKey).update(payload).digest("hex")

  const launchUrl = new URL(siteUrl)
  launchUrl.searchParams.set("d360_autologin", "1")
  launchUrl.searchParams.set("uid", String(wpUserId))
  launchUrl.searchParams.set("exp", String(expiresAt))
  launchUrl.searchParams.set("redirect_to", redirectPath)
  launchUrl.searchParams.set("sig", signature)

  return launchUrl.toString()
}

function getHeaders(): BridgeHeaders {
  const headers: BridgeHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  const portalKey = process.env.WP_BRIDGE_PORTAL_KEY
  if (portalKey) {
    headers["X-D360-Portal-Key"] = portalKey
    return headers
  }

  const basicUser = process.env.WP_BRIDGE_BASIC_USER
  const basicPassword = process.env.WP_BRIDGE_BASIC_APP_PASSWORD

  if (basicUser && basicPassword) {
    const token = Buffer.from(`${basicUser}:${basicPassword}`).toString("base64")
    headers.Authorization = `Basic ${token}`
  }

  return headers
}

export function isWordPressBridgeConfigured() {
  return Boolean(getBaseUrl() && (process.env.WP_BRIDGE_PORTAL_KEY || process.env.WP_BRIDGE_BASIC_USER))
}

async function bridgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error("WP bridge base URL is not configured")
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `Bridge request failed with status ${response.status}`

    try {
      const errorBody = (await response.json()) as { message?: string }
      if (errorBody.message) {
        message = errorBody.message
      }
    } catch {
      // Ignore JSON parsing errors and use the default message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function bridgeHealthCheck() {
  return bridgeRequest<BridgeHealthResponse>("/health", { method: "GET" })
}

export async function bridgeUpsertEmployee(input: BridgeUpsertEmployeeInput) {
  return bridgeRequest<BridgeUpsertEmployeeResponse>("/employees/upsert", {
    method: "POST",
    body: JSON.stringify({
      employee_id: input.employeeId,
      company: {
        id: input.companyId,
        name: input.companyName,
      },
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      password: input.password,
      department: input.department,
      position: input.position,
    }),
  })
}

export async function bridgeDeleteEmployee(input: BridgeDeleteEmployeeInput) {
  return bridgeRequest<BridgeDeleteEmployeeResponse>("/employees/delete", {
    method: "POST",
    body: JSON.stringify({
      employee_id: input.employeeId ?? null,
      wp_user_id: input.wpUserId ?? null,
      email: input.email ?? null,
    }),
  })
}

export async function bridgeCreateBundle(input: BridgeCreateBundleInput) {
  return bridgeRequest<BridgeCreateBundleResponse>("/bundles", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      description: input.description ?? "",
      course_ids: input.courseIds,
      visibility: input.visibility ?? "private",
    }),
  })
}

export async function bridgeEnrollCourses(userId: number, courseIds: number[]) {
  return bridgeRequest<BridgeEnrollmentResponse>("/enrollments/batch", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      course_ids: courseIds,
    }),
  })
}

export async function bridgeEnsureStudentAccess(studentId: number, courseIds: number[]) {
  return bridgeRequest<BridgeEnsureAccessResponse>(`/students/${studentId}/access/ensure`, {
    method: "POST",
    body: JSON.stringify({
      course_ids: courseIds,
    }),
  })
}

export function assertEnrollmentSucceeded(
  response: BridgeEnrollmentResponse,
  requestedCourseIds: number[]
) {
  const failedIds = new Set(response.failed_course_ids.map((item) => item.course_id))
  const enrolledIds = new Set(response.enrolled_course_ids)
  const missingIds = requestedCourseIds.filter((courseId) => !enrolledIds.has(courseId) && !failedIds.has(courseId))

  if (response.failed_course_ids.length === 0 && missingIds.length === 0) {
    return
  }

  const failedMessages = response.failed_course_ids.map(
    (item) => `Curso ${item.course_id}: ${item.message}`
  )
  const missingMessages = missingIds.map(
    (courseId) => `Curso ${courseId}: Tutor LMS no confirmo la inscripcion`
  )

  throw new Error([...failedMessages, ...missingMessages].join(" | "))
}

export function assertAccessConfirmationSucceeded(
  response: BridgeEnsureAccessResponse,
  requestedCourseIds: number[]
) {
  const okIds = new Set([
    ...response.completed_course_ids,
    ...response.already_active_ids,
  ])
  const failedIds = new Set(response.failed_course_ids.map((item) => item.course_id))
  const missingIds = requestedCourseIds.filter((courseId) => !okIds.has(courseId) && !failedIds.has(courseId))

  if (response.failed_course_ids.length === 0 && missingIds.length === 0) {
    return
  }

  const failedMessages = response.failed_course_ids.map(
    (item) => `Curso ${item.course_id}: ${item.message}`
  )
  const missingMessages = missingIds.map(
    (courseId) => `Curso ${courseId}: no se pudo confirmar acceso academico`
  )

  throw new Error([...failedMessages, ...missingMessages].join(" | "))
}

export function assertStudentHasCourses(
  studentCourses: BridgeStudentCoursesResponse,
  requiredCourseIds: number[]
) {
  const existingIds = new Set(studentCourses.courses.map((course) => course.wp_course_id))
  const missingIds = requiredCourseIds.filter((courseId) => !existingIds.has(courseId))

  if (missingIds.length === 0) {
    return
  }

  throw new Error(
    `Los cursos no quedaron visibles para el alumno en Tutor LMS: ${missingIds.join(", ")}`
  )
}

export async function bridgeGetStudentCourses(studentId: number) {
  return bridgeRequest<BridgeStudentCoursesResponse>(`/students/${studentId}/courses`, {
    method: "GET",
  })
}

export async function bridgeGetStudentCertificates(studentId: number) {
  return bridgeRequest<BridgeStudentCertificatesResponse>(`/students/${studentId}/certificates`, {
    method: "GET",
  })
}

export async function bridgeGetStudentDiagnostics(studentId: number, courseId?: number) {
  const query = courseId ? `?course_id=${courseId}` : ""

  return bridgeRequest<BridgeStudentDiagnosticsResponse>(`/students/${studentId}/diagnostics${query}`, {
    method: "GET",
  })
}

export async function bridgeListCourses() {
  return bridgeRequest<BridgeCoursesResponse>("/courses", {
    method: "GET",
  })
}

export async function bridgeGetCourseDetails(courseId: number) {
  return bridgeRequest<BridgeCourseDetails>(`/courses/${courseId}`, {
    method: "GET",
  })
}
