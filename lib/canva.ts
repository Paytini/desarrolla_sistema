import { createHash, randomBytes } from "node:crypto"

import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/format"

const CANVA_API_BASE_URL = "https://api.canva.com/rest/v1"
const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize"
const CANVA_TOKEN_STATE_KEY = "canva_oauth_token"
const CANVA_DEFAULT_SCOPES = [
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
  "design:content:write",
  "design:content:read",
]

type CanvaTokenPayload = {
  access_token: string
  refresh_token?: string | null
  token_type?: string | null
  scope?: string | null
  expires_at: string
}

type CanvaDataset = Record<string, { type?: string | null }>

type CanvaAutofillJobResponse = {
  job?: {
    id: string
    status: "in_progress" | "success" | "failed"
    result?: {
      design?: {
        id: string
        title?: string
        urls?: {
          view_url?: string | null
          edit_url?: string | null
        }
      }
    }
    error?: {
      code?: string
      message?: string
    }
  }
}

type CanvaExportJobResponse = {
  job?: {
    id: string
    status: "in_progress" | "success" | "failed"
    urls?: string[]
    error?: {
      code?: string
      message?: string
    }
  }
}

function getCanvaClientId() {
  return process.env.CANVA_CLIENT_ID?.trim() ?? ""
}

function getCanvaClientSecret() {
  return process.env.CANVA_CLIENT_SECRET?.trim() ?? ""
}

function getCanvaBrandTemplateId() {
  return process.env.CANVA_BRAND_TEMPLATE_ID?.trim() ?? ""
}

function getCanvaRedirectUri() {
  const configured = process.env.CANVA_REDIRECT_URI?.trim()
  if (configured) {
    return configured
  }

  const baseUrl = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "")
  return baseUrl ? `${baseUrl}/api/canva/oauth/callback` : ""
}

function getCanvaScopes() {
  return (process.env.CANVA_SCOPES?.trim() || CANVA_DEFAULT_SCOPES.join(" "))
    .split(/\s+/)
    .filter(Boolean)
}

export function isCanvaConfigured() {
  return Boolean(getCanvaClientId() && getCanvaClientSecret() && getCanvaRedirectUri())
}

export function isCanvaDc3Configured() {
  return Boolean(isCanvaConfigured() && getCanvaBrandTemplateId())
}

function base64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export function createCanvaPkcePair() {
  const verifier = base64Url(randomBytes(64))
  const challenge = base64Url(createHash("sha256").update(verifier).digest())

  return {
    verifier,
    challenge,
  }
}

export function createCanvaOauthState() {
  return base64Url(randomBytes(32))
}

export function buildCanvaAuthorizationUrl(input: {
  state: string
  codeChallenge: string
}) {
  const url = new URL(CANVA_AUTH_URL)
  url.searchParams.set("code_challenge_method", "s256")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", getCanvaClientId())
  url.searchParams.set("redirect_uri", getCanvaRedirectUri())
  url.searchParams.set("scope", getCanvaScopes().join(" "))
  url.searchParams.set("code_challenge", input.codeChallenge)
  url.searchParams.set("state", input.state)

  return url.toString()
}

function parseStoredCanvaToken(payload: unknown): CanvaTokenPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

  const token = payload as Partial<CanvaTokenPayload>
  if (!token.access_token || !token.expires_at) {
    return null
  }

  return token as CanvaTokenPayload
}

async function storeCanvaToken(payload: {
  access_token: string
  refresh_token?: string | null
  token_type?: string | null
  scope?: string | null
  expires_in?: number | null
}) {
  const expiresIn = Number(payload.expires_in ?? 14_400)
  const tokenPayload: CanvaTokenPayload = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? null,
    token_type: payload.token_type ?? "Bearer",
    scope: payload.scope ?? null,
    expires_at: new Date(Date.now() + Math.max(60, expiresIn) * 1000).toISOString(),
  }

  await prisma.integracionEstado.upsert({
    where: { clave: CANVA_TOKEN_STATE_KEY },
    update: { payload: tokenPayload },
    create: {
      clave: CANVA_TOKEN_STATE_KEY,
      payload: tokenPayload,
    },
  })

  return tokenPayload
}

async function requestCanvaToken(body: URLSearchParams) {
  const credentials = Buffer.from(`${getCanvaClientId()}:${getCanvaClientSecret()}`).toString("base64")
  const response = await fetch(`${CANVA_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Canva OAuth rechazo la solicitud (${response.status}).`
    throw new Error(message)
  }

  return payload as {
    access_token: string
    refresh_token?: string | null
    token_type?: string | null
    scope?: string | null
    expires_in?: number | null
  }
}

export async function exchangeCanvaAuthorizationCode(input: {
  code: string
  codeVerifier: string
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: getCanvaRedirectUri(),
  })

  return storeCanvaToken(await requestCanvaToken(body))
}

async function refreshCanvaToken(token: CanvaTokenPayload) {
  if (!token.refresh_token) {
    throw new Error("Canva no devolvio refresh token. Conecta Canva nuevamente.")
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  })

  return storeCanvaToken(await requestCanvaToken(body))
}

async function getStoredCanvaToken() {
  const stored = await prisma.integracionEstado.findUnique({
    where: { clave: CANVA_TOKEN_STATE_KEY },
  })

  return parseStoredCanvaToken(stored?.payload)
}

async function getCanvaAccessToken() {
  const token = await getStoredCanvaToken()
  if (!token) {
    throw new Error("Canva no esta conectado. Conecta la cuenta desde SuperAdmin > Integracion.")
  }

  const expiresAt = Date.parse(token.expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt - Date.now() <= 120_000) {
    return (await refreshCanvaToken(token)).access_token
  }

  return token.access_token
}

async function canvaRequest<T>(path: string, init?: RequestInit) {
  const accessToken = await getCanvaAccessToken()
  const response = await fetch(`${CANVA_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Canva respondio con estado ${response.status}.`
    throw new Error(message)
  }

  return payload as T
}

export async function getCanvaBrandTemplateDataset() {
  const brandTemplateId = getCanvaBrandTemplateId()
  if (!brandTemplateId) {
    throw new Error("Falta CANVA_BRAND_TEMPLATE_ID.")
  }

  const payload = await canvaRequest<{ dataset?: CanvaDataset }>(
    `/brand-templates/${encodeURIComponent(brandTemplateId)}/dataset`
  )

  return payload.dataset ?? {}
}

async function getCanvaBrandTemplateMeta() {
  const brandTemplateId = getCanvaBrandTemplateId()
  if (!brandTemplateId) {
    return null
  }

  const payload = await canvaRequest<{
    brand_template?: {
      id: string
      title?: string
      view_url?: string
      create_url?: string
    }
  }>(`/brand-templates/${encodeURIComponent(brandTemplateId)}`)

  return payload.brand_template ?? null
}

function normalizeFieldName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function parseCanvaFieldMap() {
  const rawValue = process.env.CANVA_DC3_FIELD_MAP_JSON?.trim()
  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

function inferSourceFromFieldName(fieldName: string) {
  const normalized = normalizeFieldName(fieldName)

  if (normalized.includes("empleado") || normalized.includes("trabajador") || normalized.includes("alumno") || normalized.includes("nombrepersona")) return "employee_full_name"
  if (normalized.includes("curso") || normalized.includes("capacitacion")) return "course_name"
  if (normalized.includes("empresa") || normalized.includes("razonsocial")) return "company_name"
  if (normalized.includes("rfc")) return "company_rfc"
  if (normalized.includes("departamento")) return "department"
  if (normalized.includes("puesto")) return "position"
  if (normalized.includes("folio")) return "folio"
  if (normalized.includes("emision") || normalized.includes("expedicion")) return "issue_date"
  if (normalized.includes("completado") || normalized.includes("finalizacion") || normalized.includes("termino") || normalized.includes("fin")) return "completed_date"
  if (normalized.includes("fecha")) return "issue_date"
  if (normalized.includes("cert")) return "wordpress_certificate_url"

  return null
}

function getDc3Value(source: string | null, context: {
  employeeFullName: string
  courseName: string
  companyName: string
  companyRfc: string
  department: string
  position: string
  folio: string
  issueDate: Date
  completedDate: Date | null
  wordpressCertificateUrl: string
}) {
  switch (source) {
    case "employee_full_name":
      return context.employeeFullName
    case "course_name":
      return context.courseName
    case "company_name":
      return context.companyName
    case "company_rfc":
      return context.companyRfc
    case "department":
      return context.department
    case "position":
      return context.position
    case "folio":
      return context.folio
    case "issue_date":
      return formatDate(context.issueDate)
    case "completed_date":
      return formatDate(context.completedDate ?? context.issueDate)
    case "wordpress_certificate_url":
      return context.wordpressCertificateUrl
    default:
      return ""
  }
}

async function buildCanvaDc3Data(constanciaId: number, dataset: CanvaDataset) {
  const constancia = await prisma.constancia.findUnique({
    where: { id: constanciaId },
    include: {
      empleado: {
        include: {
          empresa: true,
        },
      },
    },
  })

  if (!constancia) {
    throw new Error("Constancia no encontrada.")
  }

  const curso = await prisma.empleadoCurso.findUnique({
    where: {
      empleado_id_wp_curso_id: {
        empleado_id: constancia.empleado_id,
        wp_curso_id: constancia.wp_curso_id,
      },
    },
  })

  const fieldMap = parseCanvaFieldMap()
  const context = {
    employeeFullName: `${constancia.empleado.nombre} ${constancia.empleado.apellido}`.trim(),
    courseName: constancia.nombre_curso,
    companyName: constancia.empleado.empresa.nombre,
    companyRfc: constancia.empleado.empresa.rfc ?? "",
    department: constancia.empleado.departamento ?? "",
    position: constancia.empleado.puesto ?? "",
    folio: constancia.folio,
    issueDate: constancia.fecha_emision,
    completedDate: curso?.fecha_completado ?? null,
    wordpressCertificateUrl: constancia.wp_cert_url ?? "",
  }

  const data: Record<string, { type: "text"; text: string }> = {}
  for (const [fieldName, fieldDefinition] of Object.entries(dataset)) {
    if (fieldDefinition.type !== "text") {
      continue
    }

    const source = fieldMap[fieldName] ?? inferSourceFromFieldName(fieldName)
    data[fieldName] = {
      type: "text",
      text: getDc3Value(source, context),
    }
  }

  return {
    constancia,
    data,
    title: `DC3 - ${context.employeeFullName} - ${context.courseName}`.slice(0, 255),
  }
}

function describeCanvaJobError(job?: {
  error?: { code?: string; message?: string }
}) {
  return job?.error?.message || job?.error?.code || "Canva no pudo completar el trabajo."
}

async function waitForAutofillJob(jobId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const payload = await canvaRequest<CanvaAutofillJobResponse>(
      `/autofills/${encodeURIComponent(jobId)}`
    )

    if (payload.job?.status === "success") {
      return payload.job
    }

    if (payload.job?.status === "failed") {
      throw new Error(describeCanvaJobError(payload.job))
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw new Error("Canva sigue procesando el autofill. Intenta de nuevo en unos segundos.")
}

async function waitForExportJob(jobId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const payload = await canvaRequest<CanvaExportJobResponse>(
      `/exports/${encodeURIComponent(jobId)}`
    )

    if (payload.job?.status === "success") {
      return payload.job
    }

    if (payload.job?.status === "failed") {
      throw new Error(describeCanvaJobError(payload.job))
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw new Error("Canva sigue exportando el PDF. Intenta de nuevo en unos segundos.")
}

export async function generateCanvaDc3ForConstancia(constanciaId: number) {
  if (!isCanvaDc3Configured()) {
    throw new Error("Falta configurar Canva para generar DC3.")
  }

  await prisma.constancia.update({
    where: { id: constanciaId },
    data: {
      canva_estado: "IN_PROGRESS",
      canva_error: null,
    },
  })

  try {
    const dataset = await getCanvaBrandTemplateDataset()
    const { data, title } = await buildCanvaDc3Data(constanciaId, dataset)

    if (Object.keys(data).length === 0) {
      throw new Error("La plantilla de Canva no tiene campos de texto autofill disponibles.")
    }

    const autofill = await canvaRequest<CanvaAutofillJobResponse>("/autofills", {
      method: "POST",
      body: JSON.stringify({
        brand_template_id: getCanvaBrandTemplateId(),
        title,
        data,
      }),
    })

    if (!autofill.job?.id) {
      throw new Error("Canva no devolvio el ID del trabajo de autofill.")
    }

    const autofillJob = await waitForAutofillJob(autofill.job.id)
    const design = autofillJob.result?.design
    if (!design?.id) {
      throw new Error("Canva no devolvio el diseno generado.")
    }

    const exportJob = await canvaRequest<CanvaExportJobResponse>("/exports", {
      method: "POST",
      body: JSON.stringify({
        design_id: design.id,
        format: {
          type: "pdf",
          export_quality: "regular",
        },
      }),
    })

    if (!exportJob.job?.id) {
      throw new Error("Canva no devolvio el ID del trabajo de exportacion.")
    }

    const completedExport = await waitForExportJob(exportJob.job.id)
    const exportUrl = completedExport.urls?.[0] ?? null

    const updated = await prisma.constancia.update({
      where: { id: constanciaId },
      data: {
        canva_estado: "READY",
        canva_design_id: design.id,
        canva_design_url: design.urls?.view_url ?? null,
        canva_edit_url: design.urls?.edit_url ?? null,
        canva_export_url: exportUrl,
        canva_export_expires_at: exportUrl ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        canva_generada_at: new Date(),
        canva_error: null,
      },
    })

    return updated
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "No fue posible generar el DC3 en Canva."

    await prisma.constancia.update({
      where: { id: constanciaId },
      data: {
        canva_estado: "ERROR",
        canva_error: message,
      },
    })

    throw new Error(message)
  }
}

export async function generateMissingCanvaDc3ForEmployee(empleadoId: number) {
  if (!isCanvaDc3Configured()) {
    return {
      scanned: 0,
      generated: 0,
      skipped: true,
    }
  }

  const constancias = await prisma.constancia.findMany({
    where: {
      empleado_id: empleadoId,
      canva_design_id: null,
      NOT: {
        canva_estado: "IN_PROGRESS",
      },
    },
    orderBy: { fecha_emision: "desc" },
    take: 5,
  })

  let generated = 0
  for (const constancia of constancias) {
    try {
      await generateCanvaDc3ForConstancia(constancia.id)
      generated += 1
    } catch (error) {
      console.error("Canva DC3 generation failed", {
        constanciaId: constancia.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    scanned: constancias.length,
    generated,
    skipped: false,
  }
}

export async function getCanvaDiagnostics() {
  const token = await getStoredCanvaToken()
  const tokenConnected = Boolean(token)
  const tokenExpiresAt = token?.expires_at ?? null

  let brandTemplate: Awaited<ReturnType<typeof getCanvaBrandTemplateMeta>> = null
  let dataset: CanvaDataset | null = null
  let error: string | null = null

  if (isCanvaDc3Configured() && tokenConnected) {
    try {
      ;[brandTemplate, dataset] = await Promise.all([
        getCanvaBrandTemplateMeta(),
        getCanvaBrandTemplateDataset(),
      ])
    } catch (caughtError) {
      error = caughtError instanceof Error ? caughtError.message : "No fue posible consultar Canva."
    }
  }

  return {
    configured: isCanvaConfigured(),
    dc3Configured: isCanvaDc3Configured(),
    connected: tokenConnected,
    tokenExpiresAt,
    redirectUri: getCanvaRedirectUri(),
    scopes: getCanvaScopes(),
    brandTemplateId: getCanvaBrandTemplateId(),
    brandTemplate,
    dataset,
    datasetFields: dataset ? Object.entries(dataset).map(([name, value]) => ({ name, type: value.type ?? "unknown" })) : [],
    error,
  }
}
