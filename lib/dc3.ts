type NullableValue = string | number | Date | null | undefined

type Dc3MissingFieldsInput = {
  employeePosition?: string | null
  companyRfc?: string | null
  courseStartedAt?: Date | string | null
  courseCompletedAt?: Date | string | null
  durationHours?: number | null
  courseThematicArea?: string | null
  trainingAgentName?: string | null
}

type Dc3DocumentInput = {
  constanciaId: number
  constanciaFolio: string
  courseName: string
  employeeFullName: string
  employeeCurp?: string | null
  employeeOccupation?: string | null
  employeePosition?: string | null
  companyName: string
  companyRfc?: string | null
  instructorName?: string | null
  trainingAgentName?: string | null
  legalRepresentativeName?: string | null
  workersRepresentativeName?: string | null
  durationHours?: number | null
  courseStartedAt?: Date | string | null
  courseCompletedAt?: Date | string | null
  issueDate?: Date | string | null
  generatedAt?: Date
  courseThematicArea?: string | null
  courseThematicAreaCode?: string | null
}

export function buildDc3Folio(constanciaFolio: string, constanciaId: number) {
  const cleanedFolio = constanciaFolio.trim().replace(/[^A-Za-z0-9-]/g, "-")
  return `DC3-${cleanedFolio || constanciaId}`
}

export function getDc3MissingFields(input: Dc3MissingFieldsInput) {
  const missing: string[] = []

  if (!input.employeePosition?.trim()) {
    missing.push("Puesto u ocupacion especifica del trabajador")
  }

  if (!input.companyRfc?.trim()) {
    missing.push("RFC de la empresa")
  }

  if (!input.courseStartedAt) {
    missing.push("Fecha de inicio del curso")
  }

  if (!input.courseCompletedAt) {
    missing.push("Fecha de termino del curso")
  }

  if (input.durationHours === null || input.durationHours === undefined) {
    missing.push("Duracion en horas del curso")
  }

  if (!input.courseThematicArea?.trim()) {
    missing.push("Area tematica del curso")
  }

  if (!input.trainingAgentName?.trim()) {
    missing.push("Nombre del agente capacitador o STPS")
  }

  return missing
}

function hasValue(value: NullableValue) {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  return true
}

function formatDateValue(date: Date | string | null | undefined) {
  if (!date) return "Pendiente"

  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return "Pendiente"

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value)
}

function formatDateParts(date: Date | string | null | undefined) {
  if (!date) {
    return { year: "____", month: "__", day: "__" }
  }

  const value = new Date(date)
  if (Number.isNaN(value.getTime())) {
    return { year: "____", month: "__", day: "__" }
  }

  return {
    year: String(value.getFullYear()),
    month: String(value.getMonth() + 1).padStart(2, "0"),
    day: String(value.getDate()).padStart(2, "0"),
  }
}

function safeText(value: NullableValue, fallback = "Pendiente") {
  if (!hasValue(value)) return fallback
  return String(value).trim()
}

function safeOptionalText(value: NullableValue) {
  if (!hasValue(value)) return ""
  return String(value).trim()
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderCharacterBoxes(value: string, length: number, extraClass = "") {
  const normalized = value.toUpperCase().replace(/\s+/g, "")
  const chars = normalized.slice(0, length).padEnd(length, " ")

  return chars
    .split("")
    .map((char) => {
      const display = char === " " ? "&nbsp;" : escapeHtml(char)
      const className = extraClass ? `char-box ${extraClass}` : "char-box"
      return `<span class="${className}">${display}</span>`
    })
    .join("")
}

function renderDateBoxes(parts: { year: string; month: string; day: string }) {
  return `
    <td class="date-unit-label">Ano</td>
    <td class="date-unit-boxes" colspan="4">${renderCharacterBoxes(parts.year, 4, "date-box-small")}</td>
    <td class="date-unit-label">Mes</td>
    <td class="date-unit-boxes" colspan="2">${renderCharacterBoxes(parts.month, 2, "date-box-small")}</td>
    <td class="date-unit-label">Dia</td>
    <td class="date-unit-boxes" colspan="2">${renderCharacterBoxes(parts.day, 2, "date-box-small")}</td>
  `
}

function formatDurationHours(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Pendiente"
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "")
}

export function buildDc3Document(input: Dc3DocumentInput) {
  const dc3Folio = buildDc3Folio(input.constanciaFolio, input.constanciaId)
  const missingFields = getDc3MissingFields({
    employeePosition: input.employeePosition,
    companyRfc: input.companyRfc,
    courseStartedAt: input.courseStartedAt,
    courseCompletedAt: input.courseCompletedAt,
    durationHours: input.durationHours,
    courseThematicArea: input.courseThematicArea,
    trainingAgentName: input.trainingAgentName,
  })

  const generatedAt = input.generatedAt ?? new Date()
  const startParts = formatDateParts(input.courseStartedAt)
  const endParts = formatDateParts(input.courseCompletedAt)
  const issueDate = formatDateValue(input.issueDate ?? input.courseCompletedAt ?? generatedAt)
  const curp = safeOptionalText(input.employeeCurp)
  const payload = {
    dc3Folio,
    employeeFullName: safeText(input.employeeFullName),
    employeeCurp: curp,
    employeeOccupation: safeText(input.employeeOccupation ?? input.employeePosition),
    employeePosition: safeText(input.employeePosition, ""),
    companyName: safeText(input.companyName),
    companyRfc: safeOptionalText(input.companyRfc),
    courseName: safeText(input.courseName),
    durationHours: formatDurationHours(input.durationHours),
    instructorName: safeText(input.instructorName, "Pendiente"),
    trainingAgentName: safeText(
      input.trainingAgentName ?? input.instructorName,
      "Pendiente"
    ),
    legalRepresentativeName: safeText(input.legalRepresentativeName, "Pendiente"),
    workersRepresentativeName: safeText(input.workersRepresentativeName, "Pendiente"),
    issueDate,
    startParts,
    endParts,
    missingFields,
    isComplete: missingFields.length === 0,
    generatedAt: formatDateValue(generatedAt),
    courseThematicArea: safeText(input.courseThematicArea),
    courseThematicAreaCode: safeOptionalText(input.courseThematicAreaCode),
  }

  const thematicAreaLine = payload.courseThematicAreaCode
    ? `${payload.courseThematicAreaCode} - ${payload.courseThematicArea}`
    : payload.courseThematicArea

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DC-3 ${escapeHtml(payload.dc3Folio)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 14px;
        font-family: Arial, Helvetica, sans-serif;
        color: #000;
        background: #eef0f3;
      }
      .sheet {
        width: 100%;
        max-width: 940px;
        margin: 0 auto;
        background: #fff;
        padding: 10px;
        border: 1px solid #000;
      }
      .center-title {
        text-align: center;
        margin: 0 0 8px;
      }
      .center-title h1,
      .center-title h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
      }
      .center-title h2 {
        font-size: 15px;
      }
      .dc3-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 4px;
      }
      .dc3-table td,
      .dc3-table th {
        border: 1px solid #000;
        vertical-align: top;
        padding: 4px 6px;
        font-size: 11px;
      }
      .section-title {
        background: #000;
        color: #fff;
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .02em;
      }
      .field-label {
        display: block;
        font-size: 10px;
        line-height: 1.15;
        margin-bottom: 4px;
        font-weight: 700;
      }
      .field-value {
        display: block;
        min-height: 18px;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.1;
        text-transform: uppercase;
        word-break: break-word;
        color: #1f3f99;
      }
      .field-value.small {
        font-size: 12px;
      }
      .char-grid {
        display: flex;
        flex-wrap: nowrap;
        gap: 0;
      }
      .char-box {
        display: inline-flex;
        width: 20px;
        min-width: 20px;
        height: 22px;
        align-items: center;
        justify-content: center;
        border: 1px solid #000;
        margin-right: -1px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        color: #1f3f99;
      }
      .char-box.date-box-small {
        width: 20px;
        min-width: 20px;
        height: 22px;
        font-size: 11px;
      }
      .period-subtable {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .period-subtable td {
        border: 0;
        padding: 0 1px 2px 0;
        vertical-align: middle;
      }
      .period-header {
        font-size: 10px;
        font-weight: 700;
        padding-bottom: 2px;
      }
      .period-inline-label,
      .date-unit-label {
        font-size: 10px;
        text-align: center;
        white-space: nowrap;
      }
      .period-inline-separator {
        text-align: center;
        font-weight: 700;
        font-size: 12px;
      }
      .date-box-row {
        display: inline-flex;
      }
      .date-unit-boxes {
        white-space: nowrap;
      }
      .statement {
        margin-top: 6px;
        border: 1px solid #000;
        border-bottom: 0;
        padding: 8px 14px 6px;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
      }
      .sign-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .sign-table td {
        border: 1px solid #000;
        padding: 8px 8px 6px;
        text-align: center;
        vertical-align: top;
        font-size: 11px;
      }
      .signature-spacer {
        min-height: 42px;
      }
      .signature-role {
        margin-top: 2px;
        margin-bottom: 16px;
      }
      .signature-line {
        border-top: 1px solid #000;
        padding-top: 3px;
        min-height: 18px;
      }
      .signature-name {
        color: #1f3f99;
        font-weight: 700;
        text-transform: uppercase;
        line-height: 1.15;
      }
      .signature-caption {
        margin-top: 2px;
        font-weight: 700;
      }
      .notes {
        margin-top: 14px;
        font-size: 12px;
        line-height: 1.45;
      }
      .notes h3 {
        margin: 0 0 6px;
        font-size: 13px;
      }
      .notes p {
        margin: 0 0 4px;
      }
      .pending {
        margin-top: 12px;
        padding: 10px 12px;
        background: #fff7ed;
        border: 1px solid #fdba74;
        color: #9a3412;
        font-size: 13px;
      }
      .pending p {
        margin: 0 0 8px;
        font-weight: 700;
      }
      .pending ul {
        margin: 0;
        padding-left: 18px;
      }
      .footer-meta {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
      }
      .footer-badge {
        display: inline-flex;
        border: 1px solid #000;
        padding: 4px 8px;
        background: #f8fafc;
        font-weight: 700;
      }
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
        .sheet {
          max-width: none;
          padding: 8px;
          border: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="center-title">
        <h1>FORMATO DC-3</h1>
        <h2>CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES</h2>
      </div>

      <table class="dc3-table">
        <tr>
          <th class="section-title" colspan="20">DATOS DEL TRABAJADOR</th>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Nombre (Anotar apellido paterno, apellido materno y nombre(s))</span>
            <span class="field-value">${escapeHtml(payload.employeeFullName)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="14">
            <span class="field-label">Clave Unica de Registro de Poblacion</span>
            <div class="char-grid">${renderCharacterBoxes(payload.employeeCurp, 18)}</div>
          </td>
          <td colspan="6">
            <span class="field-label">Ocupacion especifica (Catalogo Nacional de Ocupaciones) 1/</span>
            <span class="field-value small">${escapeHtml(payload.employeeOccupation)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Puesto*</span>
            <span class="field-value small">${escapeHtml(payload.employeePosition || " ")}</span>
          </td>
        </tr>

        <tr>
          <th class="section-title" colspan="20">DATOS DE LA EMPRESA</th>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Nombre o razon social (En caso de persona fisica, anotar apellido paterno, apellido materno y nombre(s))</span>
            <span class="field-value">${escapeHtml(payload.companyName)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Registro Federal de Contribuyentes con homoclave (SHCP)</span>
            <div class="char-grid">${renderCharacterBoxes(payload.companyRfc, 13)}</div>
          </td>
        </tr>

        <tr>
          <th class="section-title" colspan="20">DATOS DEL PROGRAMA DE CAPACITACION, ADIESTRAMIENTO Y PRODUCTIVIDAD</th>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Nombre del curso</span>
            <span class="field-value">${escapeHtml(payload.courseName)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <span class="field-label">Duracion en horas</span>
            <span class="field-value">${escapeHtml(payload.durationHours)}</span>
          </td>
          <td colspan="16">
            <table class="period-subtable" aria-hidden="true">
              <tr>
                <td class="period-header" colspan="26">Periodo de ejecucion:</td>
              </tr>
              <tr>
                <td class="period-inline-label">De</td>
                ${renderDateBoxes(payload.startParts)}
                <td class="period-inline-separator">a</td>
                ${renderDateBoxes(payload.endParts)}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Area tematica del curso 2/</span>
            <span class="field-value small">${escapeHtml(thematicAreaLine)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="20">
            <span class="field-label">Nombre del agente capacitador o STPS 3/</span>
            <span class="field-value small">${escapeHtml(payload.trainingAgentName)}</span>
          </td>
        </tr>
      </table>

      <div class="statement">
        Los datos se asientan en esta constancia bajo protesta de decir verdad, apercibidos de la responsabilidad en que incurre todo aquel que no se conduce con verdad.
      </div>

      <table class="sign-table">
        <tr>
          <td>
            <div class="signature-spacer"></div>
            <div class="signature-role">Instructor o tutor</div>
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHtml(payload.instructorName)}</div>
          </td>
          <td>
            <div class="signature-spacer"></div>
            <div class="signature-role">Patron o representante legal 4/</div>
            <div class="signature-line"></div>
            <div class="signature-caption">Nombre y firma</div>
          </td>
          <td>
            <div class="signature-spacer"></div>
            <div class="signature-role">Representante de los trabajadores 5/</div>
            <div class="signature-line"></div>
            <div class="signature-caption">Nombre y firma</div>
          </td>
        </tr>
      </table>

      <section class="notes">
        <h3>INSTRUCCIONES</h3>
        <p>- Llenar a maquina o con letra de molde.</p>
        <p>- Debera entregarse al trabajador dentro de los veinte dias habiles siguientes al termino del curso de capacitacion aprobado.</p>
        <p>1/ Las areas y subareas ocupacionales del Catalogo Nacional de Ocupaciones se encuentran disponibles en el reverso de este formato y en www.stps.gob.mx.</p>
        <p>2/ Las areas tematicas de los cursos se encuentran disponibles en el reverso de este formato y en www.stps.gob.mx.</p>
        <p>3/ Cursos impartidos por el area competente de la Secretaria del Trabajo y Prevision Social.</p>
        <p>4/ Para empresas con menos de 51 trabajadores. Para empresas con mas de 50 trabajadores firmaria el representante del patron ante la Comision mixta de capacitacion, adiestramiento y productividad.</p>
        <p>5/ Solo para empresas con mas de 50 trabajadores.</p>
        <p>* Dato no obligatorio.</p>
      </section>

      ${
        payload.missingFields.length > 0
          ? `<section class="pending">
              <p>Campos pendientes para completar un DC-3 mas robusto:</p>
              <ul>${payload.missingFields.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </section>`
          : ""
      }

      <div class="footer-meta">
        <span class="footer-badge">Folio DC-3: ${escapeHtml(payload.dc3Folio)}</span>
        <span>Fecha de emision sugerida: ${escapeHtml(payload.issueDate)}</span>
        <span>Constancia base: ${escapeHtml(input.constanciaFolio)}</span>
        <span>Generado por Portal Desarrolla360 el ${escapeHtml(payload.generatedAt)}</span>
      </div>
    </main>
  </body>
</html>`

  return {
    dc3Folio,
    missingFields,
    isComplete: missingFields.length === 0,
    html,
  }
}
