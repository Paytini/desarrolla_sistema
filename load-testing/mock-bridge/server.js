const http = require("node:http")
const config = require("../config")

const PREFIX = "/wp-json/desarrolla360/v1"
let nextWpUserId = 920000
const enrollments = new Map() // wp_user_id -> Set<course_id>
const courseNames = {}
for (let i = 0; i < config.namespace.courseCount; i++) {
  courseNames[config.namespace.courseIdBase + i] = `LT Curso Masivo ${i + 1}`
}

function delay() {
  const cold = Math.random() < config.bridgeColdRate
  return new Promise((r) => setTimeout(r, cold ? config.bridgeColdMs : config.bridgeLatencyMs))
}

function send(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(data)
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
}

const server = http.createServer(async (req, res) => {
  req.on("error", () => {})
  res.on("error", () => {})
  if (req.headers["x-d360-portal-key"] !== config.bridgeKey) return send(res, 401, { message: "bad key" })
  if (Math.random() < config.bridgeErrorRate) return send(res, 500, { message: "lt-mock injected error" })
  await delay()

  const url = new URL(req.url, `http://localhost:${config.bridgePort}`)
  const path = url.pathname.replace(PREFIX, "")
  const studentMatch = path.match(/^\/students\/(\d+)\/(courses|certificates|access\/ensure|diagnostics)$/)

  if (path === "/health") {
    return send(res, 200, { ok: true, plugin_version: "lt-mock-1.0", site_url: `http://localhost:${config.bridgePort}`, wordpress_version: "6.5", tutor_rest_available: true, service_user_configured: true, learning_webhook_configured: true })
  }
  if (path === "/employees/upsert" && req.method === "POST") {
    const body = await readBody(req)
    return send(res, 200, { wp_user_id: nextWpUserId++, email: body.email, created: true })
  }
  if (path === "/employees/delete" && req.method === "POST") {
    const body = await readBody(req)
    return send(res, 200, { found: true, deleted: true, wp_user_id: body.wp_user_id ?? null, email: body.email ?? null, enrollment_posts_deleted: 0 })
  }
  if (path === "/enrollments/batch" && req.method === "POST") {
    const body = await readBody(req)
    const set = enrollments.get(body.user_id) ?? new Set()
    body.course_ids.forEach((id) => set.add(id))
    enrollments.set(body.user_id, set)
    return send(res, 200, { user_id: body.user_id, enrolled_course_ids: body.course_ids, failed_course_ids: [] })
  }
  if (studentMatch) {
    const studentId = Number(studentMatch[1])
    const kind = studentMatch[2]
    if (kind === "access/ensure" && req.method === "POST") {
      const body = await readBody(req)
      return send(res, 200, { student_id: studentId, completed_course_ids: body.course_ids, already_active_ids: [], failed_course_ids: [] })
    }
    if (kind === "courses") {
      const ids = [...(enrollments.get(studentId) ?? [])]
      const courses = ids.map((id) => ({ wp_course_id: id, title: courseNames[id] ?? `Curso ${id}`, progress_pct: (studentId + id) % 101, completed: (studentId + id) % 101 === 100, started_at: null, completed_at: null, certificate_url: null }))
      return send(res, 200, { student_id: studentId, courses, raw: null })
    }
    if (kind === "certificates") return send(res, 200, { student_id: studentId, certificates: [] })
    if (kind === "diagnostics") return send(res, 200, { student_id: studentId, plugin_version: "lt-mock-1.0", service_user_id: 1, tutor_courses_raw: null, tutor_courses_count: 0, direct_courses_count: 0, courses: [] })
  }
  if (path === "/courses") {
    const courses = Object.entries(courseNames).map(([id, title]) => ({ wp_course_id: Number(id), title, status: "publish", post_type: "courses", course_url: null, thumbnail_url: null }))
    return send(res, 200, { courses, total: courses.length })
  }
  return send(res, 404, { message: `lt-mock: sin ruta ${req.method} ${path}` })
})

server.listen(config.bridgePort, () => console.log(`lt-mock-bridge en http://localhost:${config.bridgePort}${PREFIX} (latencia ${config.bridgeLatencyMs}ms, frio ${config.bridgeColdRate * 100}%)`))
