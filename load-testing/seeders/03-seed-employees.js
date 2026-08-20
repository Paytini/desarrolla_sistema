const fs = require("node:fs")
const path = require("node:path")
const bcrypt = require("bcryptjs")
const { query, bulkInsert, getPool } = require("./lib/db")
const names = require("./lib/names")
const emails = require("./lib/emails")
const config = require("../config")

const CHUNK = 500

async function main() {
  const companies = JSON.parse(fs.readFileSync(path.join(config.dataDir, "companies.json")))
  const catalog = JSON.parse(fs.readFileSync(path.join(config.dataDir, "catalog.json")))
  const hash = await bcrypt.hash(config.seededPassword, 12)
  // employees.updated_at / users.updated_at are NOT NULL with no DB default (see task-6-report.md); stamp them explicitly.
  const now = new Date()
  const credLines = ["email,password"]
  const certLines = ["certId,email,password"]
  let globalIdx = 0

  for (const company of companies) {
    const employeeRows = []
    for (let i = 0; i < config.scale.employeesPerCompany; i++) {
      const email = emails.employeeEmail(company.slug, i + 1)
      const wpUserId = config.namespace.wpUserIdBase + globalIdx
      employeeRows.push([
        company.id,
        wpUserId,
        names.firstName(globalIdx),
        names.lastName(globalIdx),
        email,
        names.curp(globalIdx),
        "Operaciones",
        "Analista",
        "07.2",
        "Supervision de seguridad",
        true,
      ])
      credLines.push(`${email},${config.seededPassword}`)
      globalIdx++
    }
    for (let start = 0; start < employeeRows.length; start += CHUNK) {
      const chunk = employeeRows.slice(start, start + CHUNK)
      await bulkInsert(
        "employees",
        [
          "company_id",
          "wp_user_id",
          "first_name",
          "last_name",
          "email",
          "curp",
          "department",
          "position",
          "occupation_code",
          "occupation_name",
          "active",
          "created_at",
          "updated_at",
        ],
        chunk.map((r) => [...r, now, now]),
        "ON CONFLICT (email) DO NOTHING",
      )
      await bulkInsert(
        "users",
        [
          "email",
          "password_hash",
          "role",
          "name",
          "company_id",
          "wp_user_id",
          "active",
          "created_at",
          "updated_at",
        ],
        chunk.map((r) => [
          r[4],
          hash,
          "EMPLOYEE",
          `${r[2]} ${r[3]}`,
          company.id,
          r[1],
          true,
          now,
          now,
        ]),
        "ON CONFLICT (email) DO NOTHING",
      )
    }
    const ids = await query(
      `SELECT id, email, wp_user_id FROM employees WHERE company_id = $1 AND email LIKE $2 ORDER BY email`,
      [company.id, `emp%-${company.slug}@${emails.DOMAIN}`],
    )
    const courseRows = []
    const certRows = []
    ids.rows.forEach((emp, idx) => {
      catalog.courseIds.forEach((courseId, c) => {
        const progress = (idx * 7 + c * 23) % 101
        const completed = progress === 100 || (idx + c) % 5 === 0
        courseRows.push([
          emp.id,
          courseId,
          `LT Curso Masivo ${c + 1}`,
          completed ? 100 : progress,
          completed,
          "ACTIVE",
          "DIRECT_ENROLLMENT",
          completed ? new Date() : null,
        ])
      })
      if (idx / ids.rows.length < config.scale.certificateRatio) {
        const ref = `LT-D360-${company.id}-${emp.id}`
        certRows.push([emp.id, catalog.courseIds[0], "LT Curso Masivo 1", ref])
        certLines.push(`__CERT_${ref}__,${emp.email},${config.seededPassword}`)
      }
    })
    for (let start = 0; start < courseRows.length; start += CHUNK) {
      await bulkInsert(
        "employee_courses",
        [
          "employee_id",
          "wp_course_id",
          "course_name",
          "progress_pct",
          "completed",
          "access_status",
          "access_source",
          "completed_at",
        ],
        courseRows.slice(start, start + CHUNK),
        "ON CONFLICT (employee_id, wp_course_id) DO NOTHING",
      )
    }
    await bulkInsert(
      "certificates",
      ["employee_id", "wp_course_id", "course_name", "reference_number"],
      certRows,
      "ON CONFLICT (reference_number) DO NOTHING",
    )
    await query(
      `UPDATE companies SET used_seats = (SELECT count(*) FROM employees WHERE company_id = $1 AND active) WHERE id = $1`,
      [company.id],
    )
    console.log(`empresa ${company.slug}: ${ids.rows.length} empleados`)
  }

  // resolver ids reales de certificados para el payload
  const certs = await query(
    `SELECT c.id, c.reference_number, e.email FROM certificates c JOIN employees e ON e.id = c.employee_id WHERE c.reference_number LIKE 'LT-D360-%'`,
  )
  const byRef = new Map(certs.rows.map((r) => [r.reference_number, r]))
  const resolved = certLines
    .map((line) => {
      const m = line.match(/^__CERT_(.+)__,(.+),(.+)$/)
      if (!m) return line
      const row = byRef.get(m[1])
      return row ? `${row.id},${m[2]},${m[3]}` : null
    })
    .filter(Boolean)
  fs.writeFileSync(
    path.join(config.dataDir, "payloads", "employee-credentials.csv"),
    credLines.join("\n"),
  )
  fs.writeFileSync(path.join(config.dataDir, "payloads", "certificates.csv"), resolved.join("\n"))
  console.log(`OK empleados: ${globalIdx}, certificados: ${certs.rows.length}`)
  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
