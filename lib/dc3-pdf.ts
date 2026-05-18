import fs from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { prisma } from "@/lib/prisma"

// Coordenadas para estampar sobre el PDF oficial DC-3 (ANVERSO).
// Hoja: US Letter 612 x 792 pt. Origen pdf-lib: esquina inferior izquierda.
// Si una sección queda desalineada, ajusta solo los valores de este objeto.
// Coordenadas calibradas sobre el PDF oficial DC-3 (ANVERSO, US Letter 612x792 pt).
// Origen pdf-lib: esquina inferior izquierda. Y mayor = más arriba en la página.
// Ajusta solo este objeto si algún campo queda desalineado.
const POS = {
  // DATOS DEL TRABAJADOR
  nombre:          { x: 60,  y: 638, size: 10 },
  curpStartX:      40,
  curpY:           608,
  curpStep:        13.1,
  ocupacion:       { x: 340, y: 608, size: 9 },
  puesto:          { x: 60,  y: 579, size: 10 },
  // DATOS DE LA EMPRESA
  razonSocial:     { x: 60,  y: 530, size: 10 },
  rfcStartX:       40,
  rfcY:            499,
  rfcStep:         13,
  // DATOS DEL PROGRAMA
  curso:           { x: 60,  y: 452, size: 10 },
  duracion:        { x: 60,  y: 414, size: 10 },
  fechaInicioAnio: { x: 290, y: 414, size: 10 },
  fechaInicioMes:  { x: 334, y: 414, size: 10 },
  fechaInicioDia:  { x: 374, y: 414, size: 10 },
  fechaFinAnio:    { x: 436, y: 414, size: 10 },
  fechaFinMes:     { x: 480, y: 414, size: 10 },
  fechaFinDia:     { x: 523, y: 414, size: 10 },
  areaTematica:    { x: 60,  y: 376, size: 10 },
  agenteCapacitador:{ x: 60, y: 338, size: 10 },
  // FIRMAS
  instructorFirma: { x: 95,  y: 210, w: 120, h: 40 },
  instructorNombre:{ x: 95,  y: 196, size: 9 },
  // CONTROL INTERNO
  folio:           { x: 430, y: 60,  size: 8 },
  emision:         { x: 430, y: 50,  size: 8 },
} as const

export class Dc3MissingFieldsError extends Error {
  readonly fields: string[]
  constructor(fields: string[]) {
    super(`Faltan campos obligatorios para emitir DC-3: ${fields.join(", ")}`)
    this.name = "Dc3MissingFieldsError"
    this.fields = fields
  }
}

export type Dc3GenerateInput = {
  constanciaId: number
}

export async function generateDc3Pdf({ constanciaId }: Dc3GenerateInput): Promise<Uint8Array> {
  const constancia = await prisma.constancia.findUnique({
    where: { id: constanciaId },
    include: {
      empleado: { include: { empresa: true } },
    },
  })

  if (!constancia) {
    throw new Error(`Constancia ${constanciaId} no encontrada`)
  }
  const empleado = constancia.empleado
  const empresa = empleado.empresa
  if (!empresa) {
    throw new Error("La constancia esta vinculada a un empleado sin empresa")
  }

  const [metadata, empleadoCurso] = await Promise.all([
    prisma.cursoDc3Metadata.findUnique({ where: { wp_curso_id: constancia.wp_curso_id } }),
    prisma.empleadoCurso.findUnique({
      where: {
        empleado_id_wp_curso_id: {
          empleado_id: constancia.empleado_id,
          wp_curso_id: constancia.wp_curso_id,
        },
      },
    }),
  ])

  const missing: string[] = []
  if (!empleado.nombre || !empleado.apellido) missing.push("Nombre completo del trabajador")
  if (!empleado.curp) missing.push("CURP del trabajador")
  if (!empleado.ocupacion_especifica) missing.push("Ocupacion especifica")
  if (!empleado.ocupacion_especifica_clave) missing.push("Clave de ocupacion especifica")
  if (!empresa.nombre) missing.push("Razon social de la empresa")
  if (!empresa.rfc) missing.push("RFC de la empresa")

  if (missing.length > 0) {
    throw new Dc3MissingFieldsError(missing)
  }

  // Fecha de termino: usa fecha_completado del empleado-curso; si no existe, cae a fecha_emision de la constancia.
  const fechaTermino = empleadoCurso?.fecha_completado ?? constancia.fecha_emision
  // Fecha de inicio: usa fecha_inicio_curso; si no existe, cae a fecha_emision.
  const fechaInicio = empleadoCurso?.fecha_inicio_curso ?? constancia.fecha_emision

  const templatePath = path.join(process.cwd(), "public", "templates", "dc3.pdf")
  const templateBytes = await fs.readFile(templatePath)
  const pdf = await PDFDocument.load(templateBytes)
  const page = pdf.getPages()[0]
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica)

  const draw = (text: string, x: number, y: number, size = 10) => {
    page.drawText(text, { x, y, size, font: helvetica, color: rgb(0, 0, 0) })
  }

  // DC-3 requiere: Apellido Paterno, Apellido Materno, Nombre(s)
  const fullName = [empleado.apellido, empleado.apellido_materno, empleado.nombre]
    .filter(Boolean)
    .join(" ")
    .trim()
  draw(fullName, POS.nombre.x, POS.nombre.y, POS.nombre.size)

  const curp = empleado.curp!.toUpperCase().slice(0, 18)
  for (let i = 0; i < curp.length; i++) {
    draw(curp[i], POS.curpStartX + i * POS.curpStep, POS.curpY, 10)
  }

  draw(
    `${empleado.ocupacion_especifica_clave} ${empleado.ocupacion_especifica}`,
    POS.ocupacion.x,
    POS.ocupacion.y,
    POS.ocupacion.size,
  )

  if (empleado.puesto) {
    draw(empleado.puesto, POS.puesto.x, POS.puesto.y, POS.puesto.size)
  }

  draw(empresa.nombre, POS.razonSocial.x, POS.razonSocial.y, POS.razonSocial.size)

  const rfc = empresa.rfc!.toUpperCase().slice(0, 13)
  for (let i = 0; i < rfc.length; i++) {
    draw(rfc[i], POS.rfcStartX + i * POS.rfcStep, POS.rfcY, 10)
  }

  draw(metadata?.nombre_curso || constancia.nombre_curso, POS.curso.x, POS.curso.y, POS.curso.size)

  if (metadata?.duracion_horas != null) {
    draw(formatHoras(metadata.duracion_horas), POS.duracion.x, POS.duracion.y, POS.duracion.size)
  }

  const start = splitDate(fechaInicio)
  const end = splitDate(fechaTermino)
  draw(start.y, POS.fechaInicioAnio.x, POS.fechaInicioAnio.y, 10)
  draw(start.m, POS.fechaInicioMes.x, POS.fechaInicioMes.y, 10)
  draw(start.d, POS.fechaInicioDia.x, POS.fechaInicioDia.y, 10)
  draw(end.y, POS.fechaFinAnio.x, POS.fechaFinAnio.y, 10)
  draw(end.m, POS.fechaFinMes.x, POS.fechaFinMes.y, 10)
  draw(end.d, POS.fechaFinDia.x, POS.fechaFinDia.y, 10)

  if (metadata?.area_tematica_nombre) {
    const area = metadata.area_tematica_clave
      ? `${metadata.area_tematica_clave} ${metadata.area_tematica_nombre}`
      : metadata.area_tematica_nombre
    draw(area, POS.areaTematica.x, POS.areaTematica.y, POS.areaTematica.size)
  }

  if (metadata?.agente_capacitador_nombre) {
    const agente = metadata.agente_capacitador_registro
      ? `${metadata.agente_capacitador_nombre} - ${metadata.agente_capacitador_registro}`
      : metadata.agente_capacitador_nombre
    draw(agente, POS.agenteCapacitador.x, POS.agenteCapacitador.y, POS.agenteCapacitador.size)
  }

  if (metadata?.instructor_firma_url) {
    await drawInstructorFirma(pdf, page, metadata.instructor_firma_url)
  }
  if (metadata?.instructor_nombre) {
    draw(metadata.instructor_nombre, POS.instructorNombre.x, POS.instructorNombre.y, POS.instructorNombre.size)
  }

  draw(`Folio: ${constancia.folio}`, POS.folio.x, POS.folio.y, POS.folio.size)
  draw(
    `Emision: ${constancia.fecha_emision.toISOString().slice(0, 10)}`,
    POS.emision.x,
    POS.emision.y,
    POS.emision.size,
  )

  return await pdf.save()
}

function splitDate(d: Date) {
  return {
    y: d.getUTCFullYear().toString().padStart(4, "0"),
    m: (d.getUTCMonth() + 1).toString().padStart(2, "0"),
    d: d.getUTCDate().toString().padStart(2, "0"),
  }
}

function formatHoras(horas: number) {
  return Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace(/\.0$/, "")
}

async function drawInstructorFirma(
  pdf: PDFDocument,
  page: ReturnType<PDFDocument["getPages"]>[number],
  firmaUrl: string,
) {
  const relative = firmaUrl.startsWith("/") ? firmaUrl.slice(1) : firmaUrl
  const firmaPath = path.join(process.cwd(), "public", relative)
  try {
    const bytes = await fs.readFile(firmaPath)
    const image = await pdf.embedPng(bytes)
    page.drawImage(image, {
      x: POS.instructorFirma.x,
      y: POS.instructorFirma.y,
      width: POS.instructorFirma.w,
      height: POS.instructorFirma.h,
    })
  } catch (err) {
    console.warn(`[dc3] no se pudo cargar firma del instructor (${firmaPath}):`, err)
  }
}
