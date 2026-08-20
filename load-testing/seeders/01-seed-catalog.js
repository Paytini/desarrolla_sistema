const fs = require("node:fs")
const path = require("node:path")
const { query, bulkInsert, getPool } = require("./lib/db")
const config = require("../config")

async function main() {
  fs.mkdirSync(config.dataDir, { recursive: true })
  const name = `${config.namespace.packagePrefix}Paquete Masivo`
  let pkg = await query(`SELECT id FROM packages WHERE name = $1`, [name])
  if (pkg.rows.length === 0) {
    pkg = await query(
      `INSERT INTO packages (name, description, delivery_mode, active, created_at, updated_at) VALUES ($1, 'Paquete de load testing', 'DIRECT_ENROLLMENT', true, now(), now()) RETURNING id`,
      [name],
    )
  }
  const packageId = pkg.rows[0].id
  const courseIds = []
  const courseRows = []
  const dc3Rows = []
  const now = new Date()
  for (let i = 0; i < config.namespace.courseCount; i++) {
    const courseId = config.namespace.courseIdBase + i
    courseIds.push(courseId)
    courseRows.push([packageId, courseId, `LT Curso Masivo ${i + 1}`, 8])
    dc3Rows.push([
      courseId,
      `LT Curso Masivo ${i + 1}`,
      8,
      "Seguridad",
      "07.2",
      "Desarrolla360 LT",
      "LT-REG-001",
      "Instructor LT",
      now,
      now,
    ])
  }
  await bulkInsert(
    "package_courses",
    ["package_id", "wp_course_id", "course_name", "lesson_count"],
    courseRows,
    "ON CONFLICT (package_id, wp_course_id) DO NOTHING",
  )
  await bulkInsert(
    "course_dc3_metadata",
    [
      "wp_course_id",
      "course_name",
      "duration_hours",
      "subject_area_name",
      "subject_area_code",
      "training_agent_name",
      "training_agent_registration",
      "instructor_name",
      "created_at",
      "updated_at",
    ],
    dc3Rows.map((r) => r),
    "ON CONFLICT (wp_course_id) DO NOTHING",
  )
  fs.writeFileSync(
    path.join(config.dataDir, "catalog.json"),
    JSON.stringify({ packageId, courseIds }),
  )
  console.log(`OK catalogo: package ${packageId}, cursos ${courseIds.join(",")}`)
  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
