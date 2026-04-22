type TutorApiHeaders = Record<string, string>

export type TutorEnrollmentRecord = {
  enrollment_id: number
  user_id?: number | null
  course_id?: number | null
  status?: string | null
  raw?: Record<string, unknown>
}

function getTutorApiKey() {
  return (
    process.env.TUTORLMS_API_KEY?.trim() ??
    process.env.TUTORLMS_API_PASSWORD?.trim() ??
    ""
  )
}

function getTutorApiSecret() {
  return process.env.TUTORLMS_SECRET?.trim() ?? ""
}

function getTutorApiBaseUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL?.replace(/\/$/, "")
  if (!siteUrl) {
    return ""
  }

  return `${siteUrl}/wp-json/tutor/v1`
}

function getTutorApiHeaders(): TutorApiHeaders {
  const apiKey = getTutorApiKey()
  const apiSecret = getTutorApiSecret()

  if (!apiKey || !apiSecret) {
    return {}
  }

  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${token}`,
  }
}

export function isTutorApiConfigured() {
  return Boolean(getTutorApiBaseUrl() && getTutorApiKey() && getTutorApiSecret())
}

async function tutorApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getTutorApiBaseUrl()
  if (!baseUrl) {
    throw new Error("Tutor LMS API base URL is not configured")
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...getTutorApiHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `Tutor LMS API request failed with status ${response.status}`

    try {
      const errorBody = (await response.json()) as { message?: string }
      if (errorBody.message) {
        message = errorBody.message
      }
    } catch {
      // Ignore parsing issues and keep the default message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

function extractFirstNumber(
  item: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10)
      if (Number.isInteger(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function extractFirstString(
  item: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function normalizeEnrollmentList(payload: unknown) {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)
      ? (payload as { data: unknown[] }).data
      : payload && typeof payload === "object" && Array.isArray((payload as { enrollments?: unknown[] }).enrollments)
        ? (payload as { enrollments: unknown[] }).enrollments
        : []

  const enrollments: TutorEnrollmentRecord[] = []

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue
    }

    const raw = item as Record<string, unknown>
    const enrollmentId = extractFirstNumber(raw, [
      "enrollment_id",
      "id",
      "ID",
      "order_id",
    ])

    if (!enrollmentId) {
      continue
    }

    enrollments.push({
      enrollment_id: enrollmentId,
      user_id: extractFirstNumber(raw, ["user_id", "student_id", "author_id"]),
      course_id: extractFirstNumber(raw, ["course_id", "post_id"]),
      status: extractFirstString(raw, ["status", "post_status", "enrollment_status"]),
      raw,
    })
  }

  return enrollments
}

export async function tutorListCourseEnrollments(courseId: number) {
  const payload = await tutorApiRequest<unknown>(`/enrollments?course_id=${courseId}`, {
    method: "GET",
  })

  return normalizeEnrollmentList(payload)
}

export async function tutorCompleteEnrollment(enrollmentId: number) {
  return tutorApiRequest<unknown>("/enrollments/completed", {
    method: "PUT",
    body: JSON.stringify({
      enrollment_id: enrollmentId,
      status: "completed",
    }),
  })
}

export async function ensureTutorEnrollmentAccess(userId: number, courseIds: number[]) {
  if (!isTutorApiConfigured() || courseIds.length === 0) {
    return
  }

  for (const courseId of courseIds) {
    const enrollments = await tutorListCourseEnrollments(courseId)

    const matchedEnrollment = enrollments.find((enrollment) => enrollment.user_id === userId)

    if (!matchedEnrollment) {
      throw new Error(
        `Tutor LMS no devolvio una matricula para el usuario ${userId} en el curso ${courseId}`
      )
    }

    if ((matchedEnrollment.status ?? "").toLowerCase() === "completed") {
      continue
    }

    await tutorCompleteEnrollment(matchedEnrollment.enrollment_id)
  }
}
