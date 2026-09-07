// Fase de login separada del resto de la carga.
//
// Autentica N usuarios por la API, mide cuanto cuesta ESA fase sola, y guarda
// las cookies de sesion en data/payloads/sessions-*.csv para que el escenario
// 23-http-sesion-precargada.yml navegue sin volver a pasar por el login.
//
// Sirve para responder: si el login deja de ser el cuello, ¿que se rompe
// despues? Mezclado con la navegacion no se puede saber, porque el login se
// come el presupuesto de la corrida.
//
//   npm run prelogin
//   LT_PRELOGIN_EMPLOYEES=400 LT_PRELOGIN_RH=100 LT_PRELOGIN_CONCURRENCY=10 npm run prelogin

const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const EMPLOYEES = Number(process.env.LT_PRELOGIN_EMPLOYEES || 400)
const RH = Number(process.env.LT_PRELOGIN_RH || 100)
const CONCURRENCY = Number(process.env.LT_PRELOGIN_CONCURRENCY || 10)

const payloadsDir = path.join(config.dataDir, "payloads")

function readCredentials(file) {
  return fs
    .readFileSync(path.join(payloadsDir, file), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","))
}

async function login(email, password) {
  const startedAt = Date.now()
  const jar = new Map()
  const collect = (res) => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    for (const cookie of raw) {
      const [pair] = cookie.split(";")
      const [name, value] = pair.split("=")
      jar.set(name, value)
    }
  }
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")

  const csrfRes = await fetch(`${config.targetUrl}/api/auth/csrf`)
  collect(csrfRes)
  const { csrfToken } = await csrfRes.json()

  const loginRes = await fetch(`${config.targetUrl}/api/auth/callback/credentials`, {
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
  collect(loginRes)

  const hasSession = [...jar.keys()].some((name) => name.includes("session-token"))
  if (!hasSession) {
    throw new Error(`sin cookie de sesion (status ${loginRes.status})`)
  }

  return { cookie: cookieHeader(), ms: Date.now() - startedAt }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0

  async function drain() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, drain))
  return results
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

function report(label, outcomes, wallMs) {
  const ok = outcomes.filter((o) => o.cookie)
  const failed = outcomes.filter((o) => !o.cookie)
  const times = ok.map((o) => o.ms)

  console.log(`\n${label}`)
  console.log(`  logins ok:      ${ok.length}/${outcomes.length}`)
  if (failed.length > 0) {
    console.log(`  fallidos:       ${failed.length}  (${failed[0].error})`)
  }
  console.log(`  tiempo total:   ${(wallMs / 1000).toFixed(1)}s`)
  console.log(`  throughput:     ${(ok.length / (wallMs / 1000)).toFixed(1)} logins/s`)
  console.log(
    `  latencia:       p50 ${percentile(times, 50)}ms · p95 ${percentile(times, 95)}ms · max ${Math.max(0, ...times)}ms`,
  )
  return { ok, failed }
}

async function main() {
  const employeeRows = readCredentials("employee-credentials.csv").slice(0, EMPLOYEES)
  const rhRows = readCredentials("rh-credentials.csv").slice(0, RH)

  if (employeeRows.length < EMPLOYEES || rhRows.length < RH) {
    console.warn(
      `aviso: el CSV sembrado tiene ${employeeRows.length} empleados y ${rhRows.length} RH; se usara lo que hay`,
    )
  }

  console.log("=".repeat(70))
  console.log(" FASE DE LOGIN — autentica a todos antes de medir la navegacion")
  console.log("=".repeat(70))
  console.log(`  target:       ${config.targetUrl}`)
  console.log(`  empleados:    ${employeeRows.length}`)
  console.log(`  RH:           ${rhRows.length}`)
  console.log(`  concurrencia: ${CONCURRENCY}`)
  console.log(`  env vars:     LT_PRELOGIN_EMPLOYEES, LT_PRELOGIN_RH, LT_PRELOGIN_CONCURRENCY`)
  console.log("=".repeat(70))

  const empStart = Date.now()
  const empOutcomes = await runPool(employeeRows, CONCURRENCY, async ([email, password]) => {
    try {
      return await login(email, password)
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  })
  const empResult = report(`EMPLEADOS (${employeeRows.length})`, empOutcomes, Date.now() - empStart)

  const rhStart = Date.now()
  const rhOutcomes = await runPool(rhRows, CONCURRENCY, async ([email, password, slug]) => {
    try {
      const session = await login(email, password)
      return { ...session, slug }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  })
  const rhResult = report(`RH (${rhRows.length})`, rhOutcomes, Date.now() - rhStart)

  const empFile = path.join(payloadsDir, "sessions-employee.csv")
  const rhFile = path.join(payloadsDir, "sessions-rh.csv")

  fs.writeFileSync(
    empFile,
    ["empCookie", ...empResult.ok.map((o) => `"${o.cookie}"`)].join("\n") + "\n",
  )
  fs.writeFileSync(
    rhFile,
    ["rhCookie,rhSlug", ...rhResult.ok.map((o) => `"${o.cookie}",${o.slug}`)].join("\n") + "\n",
  )

  console.log(`\nsesiones guardadas:`)
  console.log(`  ${path.relative(process.cwd(), empFile)}  (${empResult.ok.length})`)
  console.log(`  ${path.relative(process.cwd(), rhFile)}  (${rhResult.ok.length})`)
  console.log(`\nsiguiente:  npm run simulate:sessions`)

  if (empResult.ok.length === 0 && rhResult.ok.length === 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
