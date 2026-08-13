import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { PDFDocument, PDFImage, StandardFonts, rgb } from "pdf-lib"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"

const POS = {
  name:             { x: 40,  y: 590, size: 10 },
  curpStartX:       31,
  curpY:            559,
  curpStep:         14.6,
  occupation:       { x: 305, y: 559, size: 9 },
  position:         { x: 40,  y: 535, size: 10 },
  companyLegalName: { x: 40,  y: 475, size: 10 },
  rfcStartX:        32,
  rfcY:             442,
  rfcStep:          14,
  course:           { x: 32,  y: 390, size: 9  },
  duration:         { x: 32,  y: 364, size: 10 },
  dates: {
    y: 362,
    step: 17,
    startYearX:  250,
    startMonthX: 322,
    startDayX:   363,
    endYearX:    426,
    endMonthX:   505,
    endDayX:     545,
  },
  subjectArea:      { x: 32,  y: 339, size: 10 },
  trainingAgent:    { x: 32,  y: 313, size: 10 },
  instructorSignature: { x: 85,  y: 220, w: 90,  h: 27 },
  instructorName:   { x: 90,  y: 216, size: 7 },
  logoImage: { x: 32, y: 735, w: 140, h: 42 },
  logoMask: { x: 0, y: 715, w: 612, h: 78 },
  folio:            { x: 430, y: 60,  size: 8 },
  issuedDate:       { x: 430, y: 50,  size: 8 },
} as const

const TEXT_COLOR = rgb(0.04, 0.18, 0.62)

export class Dc3MissingFieldsError extends Error {
  readonly fields: string[]
  constructor(fields: string[]) {
    super(`Faltan campos obligatorios para emitir DC-3: ${fields.join(", ")}`)
    this.name = "Dc3MissingFieldsError"
    this.fields = fields
  }
}

export type Dc3GenerateInput = {
  certificateId: number
}

export async function generateDc3Pdf({ certificateId }: Dc3GenerateInput): Promise<Uint8Array> {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      employee: { include: { company: true } },
    },
  })

  if (!certificate) {
    throw new Error(`Constancia ${certificateId} no encontrada`)
  }
  const employee = certificate.employee
  const company = employee.company
  if (!company) {
    throw new Error("La constancia esta vinculada a un empleado sin empresa")
  }

  const [metadata, employeeCourse] = await Promise.all([
    prisma.courseDc3Metadata.findUnique({ where: { wp_course_id: certificate.wp_course_id } }),
    prisma.employeeCourse.findUnique({
      where: {
        employee_id_wp_course_id: {
          employee_id: certificate.employee_id,
          wp_course_id: certificate.wp_course_id,
        },
      },
    }),
  ])

  const missing: string[] = []
  if (!employee.first_name || !employee.last_name) missing.push("Nombre completo del trabajador")
  if (!employee.curp) missing.push("CURP del trabajador")
  if (!employee.occupation_name) missing.push("Ocupacion especifica")
  if (!employee.occupation_code) missing.push("Clave de ocupacion especifica")
  if (!company.name) missing.push("Razon social de la empresa")
  if (!company.rfc) missing.push("RFC de la empresa")

  if (missing.length > 0) {
    throw new Dc3MissingFieldsError(missing)
  }

  const endDate = employeeCourse?.completed_at ?? certificate.issued_at
  const startDate = employeeCourse?.course_start_date ?? certificate.issued_at

  const templatePath = path.join(process.cwd(), "public", "templates", "dc3.pdf")
  const templateBytes = await fs.readFile(templatePath)
  const pdf = await PDFDocument.load(templateBytes)
  const page = pdf.getPages()[0]
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica)

  await drawLogoDesarrolla(pdf, page)

  const draw = (text: string, x: number, y: number, size = 10) => {
    const clean = sanitizeText(text).toUpperCase()
    if (!clean) return
    page.drawText(clean, { x, y, size, font: helvetica, color: TEXT_COLOR })
  }

  const fullName = [employee.last_name, employee.second_last_name, employee.first_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  draw(fullName, POS.name.x, POS.name.y, POS.name.size)

  const curp = employee.curp!.toUpperCase().slice(0, 18)
  for (let i = 0; i < curp.length; i++) {
    draw(curp[i], POS.curpStartX + i * POS.curpStep, POS.curpY, 10)
  }

  draw(
    `${employee.occupation_code} ${employee.occupation_name}`,
    POS.occupation.x,
    POS.occupation.y,
    POS.occupation.size,
  )

  if (employee.position) {
    draw(employee.position, POS.position.x, POS.position.y, POS.position.size)
  }

  draw(company.name, POS.companyLegalName.x, POS.companyLegalName.y, POS.companyLegalName.size)

  const rfc = company.rfc!.toUpperCase().slice(0, 13)
  for (let i = 0; i < rfc.length; i++) {
    draw(rfc[i], POS.rfcStartX + i * POS.rfcStep, POS.rfcY, 10)
  }

  draw(truncate(metadata?.course_name || certificate.course_name, 90), POS.course.x, POS.course.y, POS.course.size)

  if (metadata?.duration_hours != null) {
    draw(formatHours(metadata.duration_hours), POS.duration.x, POS.duration.y, POS.duration.size)
  }

  const start = splitDate(startDate)
  const end = splitDate(endDate)
  const { y: fy, step: dateStep, startYearX, startMonthX, startDayX, endYearX, endMonthX, endDayX } = POS.dates
  const drawDigits = (digits: string, startX: number) => {
    for (let i = 0; i < digits.length; i++) {
      draw(digits[i], startX + i * dateStep, fy, 10)
    }
  }
  drawDigits(start.y, startYearX)
  drawDigits(start.m, startMonthX)
  drawDigits(start.d, startDayX)
  drawDigits(end.y, endYearX)
  drawDigits(end.m, endMonthX)
  drawDigits(end.d, endDayX)

  if (metadata?.subject_area_name) {
    const subjectArea = metadata.subject_area_code
      ? `${metadata.subject_area_code} ${metadata.subject_area_name}`
      : metadata.subject_area_name
    draw(subjectArea, POS.subjectArea.x, POS.subjectArea.y, POS.subjectArea.size)
  }

  if (metadata?.training_agent_name) {
    const trainingAgent = metadata.training_agent_registration
      ? `${metadata.training_agent_name} - ${metadata.training_agent_registration}`
      : metadata.training_agent_name
    draw(trainingAgent, POS.trainingAgent.x, POS.trainingAgent.y, POS.trainingAgent.size)
  }

  if (metadata?.instructor_signature_url) {
    await drawInstructorSignature(pdf, page, metadata.instructor_signature_url)
  }
  if (metadata?.instructor_name) {
    draw(metadata.instructor_name, POS.instructorName.x, POS.instructorName.y, POS.instructorName.size)
  }

  draw(`FOLIO: ${certificate.reference_number}`, POS.folio.x, POS.folio.y, POS.folio.size)
  draw(
    `EMISION: ${certificate.issued_at.toISOString().slice(0, 10)}`,
    POS.issuedDate.x,
    POS.issuedDate.y,
    POS.issuedDate.size,
  )

  while (pdf.getPageCount() > 1) {
    pdf.removePage(pdf.getPageCount() - 1)
  }

  return await pdf.save()
}

export async function getOrCreateDc3PdfBytes({ certificateId }: Dc3GenerateInput): Promise<Uint8Array> {
  const cached = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: { dc3_pdf_url: true },
  })

  if (!cached) {
    throw new Error(`Constancia ${certificateId} no encontrada`)
  }

  if (cached.dc3_pdf_url) {
    try {
      return await fetchImageBytes(cached.dc3_pdf_url)
    } catch (err) {
      console.warn(`[dc3] no se pudo leer el PDF cacheado de constancia ${certificateId}, regenerando:`, err)
    }
  }

  const pdfBytes = await generateDc3Pdf({ certificateId })

  try {
    const blob = await put(`constancias/dc3-${certificateId}.pdf`, Buffer.from(pdfBytes), {
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: false,
    })

    await prisma.certificate.update({
      where: { id: certificateId },
      data: { dc3_pdf_url: blob.url },
    })
  } catch (err) {
    console.error(`[dc3] no se pudo subir a Blob el PDF de constancia ${certificateId}, se sirve sin cachear:`, err)
  }

  return pdfBytes
}

function sanitizeText(text: string): string {
  return text
    .replace(/&#8211;|&#x2013;|–/g, "-")
    .replace(/&#8212;|&#x2014;|—/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text
}

function splitDate(d: Date) {
  return {
    y: d.getUTCFullYear().toString().padStart(4, "0"),
    m: (d.getUTCMonth() + 1).toString().padStart(2, "0"),
    d: d.getUTCDate().toString().padStart(2, "0"),
  }
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, "")
}

async function fetchImageBytes(urlOrPath: string): Promise<Buffer> {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    let parsed: URL
    try {
      parsed = new URL(urlOrPath)
    } catch {
      throw new Error(`URL de imagen inválida: ${urlOrPath}`)
    }

    const isVercelBlob =
      parsed.hostname === "blob.vercel-storage.com" ||
      parsed.hostname.endsWith(".vercel-storage.com")

    if (!isVercelBlob) {
      throw new Error(`URL de imagen no permitida. Solo se aceptan imágenes de Vercel Blob: ${urlOrPath}`)
    }

    const headers: HeadersInit = {}
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(urlOrPath, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status} al obtener imagen: ${urlOrPath}`)
    return Buffer.from(await res.arrayBuffer())
  }
  const relative = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath
  return fs.readFile(path.join(process.cwd(), "public", relative))
}

async function processImage(rawBytes: Buffer): Promise<Buffer> {
  return sharp(rawBytes)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer()
}

async function drawLogoDesarrolla(
  pdf: PDFDocument,
  page: ReturnType<PDFDocument["getPages"]>[number],
) {
  try {
    const rawBytes = await fetchImageBytes("/assets/logo_desarrolla_cropped.png")
    const image = await pdf.embedPng(await processImage(rawBytes))
    const { x: mx, y: my, w: mw, h: mh } = POS.logoMask
    page.drawRectangle({ x: mx, y: my, width: mw, height: mh, color: rgb(1, 1, 1) })
    const { x, y, w, h } = POS.logoImage
    page.drawImage(image, { x, y, width: w, height: h, opacity: 1 })
  } catch (err) {
    console.warn("[dc3] no se pudo dibujar el logo:", err)
  }
}

async function drawInstructorSignature(
  pdf: PDFDocument,
  page: ReturnType<PDFDocument["getPages"]>[number],
  signatureUrl: string,
) {
  let rawBytes: Buffer
  try {
    rawBytes = await fetchImageBytes(signatureUrl)
  } catch (err) {
    console.warn(`[dc3] no se pudo obtener la firma (${signatureUrl}):`, err)
    return
  }

  let pngBytes: Buffer
  try {
    pngBytes = await processImage(rawBytes)
  } catch (err) {
    console.error(`[dc3] sharp no pudo procesar la firma (${signatureUrl}):`, err)
    return
  }

  let image: PDFImage
  try {
    image = await pdf.embedPng(pngBytes)
  } catch (err) {
    console.error(`[dc3] pdf-lib no pudo embeber la firma (${signatureUrl}):`, err)
    return
  }

  const { x, y, w, h } = POS.instructorSignature
  page.drawImage(image, { x, y, width: w, height: h, opacity: 1 })
}
