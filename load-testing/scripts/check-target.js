const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

async function apiLogin(baseUrl, email, password) {
  const jar = new Map()
  const setCookies = (res) => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    raw.forEach((c) => {
      const [pair] = c.split(";")
      const [k, v] = pair.split("=")
      jar.set(k, v)
    })
  }
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")

  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
  setCookies(csrfRes)
  const { csrfToken } = await csrfRes.json()
  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      turnstileToken: config.turnstileDummyToken,
    }),
  })
  setCookies(loginRes)
  const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: cookieHeader() },
  })
  const session = await sessionRes.json()
  if (!session?.user?.role)
    throw new Error(`login fallido para ${email}: ${JSON.stringify(session)}`)
  return { cookieHeader: cookieHeader(), session }
}

async function main() {
  const base = config.targetUrl
  const health = await fetch(`${base}/api/health`)
    .then((r) => r.status)
    .catch(() => "sin respuesta")
  console.log(`GET /api/health → ${health}`)

  const admin = await apiLogin(base, config.superadmin.email, config.superadmin.password)
  console.log(`SUPERADMIN ok: ${admin.session.user.role}`)

  const rhCsv = fs
    .readFileSync(path.join(config.dataDir, "payloads", "rh-credentials.csv"), "utf8")
    .trim()
    .split("\n")
  const [rhEmail, rhPassword, rhSlug] = rhCsv[1].split(",")
  const rh = await apiLogin(base, rhEmail, rhPassword)
  console.log(
    `RH ok: ${rh.session.user.role} empresa=${rh.session.user.empresa_slug} (esperado ${rhSlug})`,
  )

  const empCsv = fs
    .readFileSync(path.join(config.dataDir, "payloads", "employee-credentials.csv"), "utf8")
    .trim()
    .split("\n")
  const [empEmail, empPassword] = empCsv[1].split(",")
  const emp = await apiLogin(base, empEmail, empPassword)
  console.log(`EMPLEADO ok: ${emp.session.user.role}`)
  console.log("OK: target listo para carga")
}

if (require.main === module)
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
module.exports = { apiLogin }
