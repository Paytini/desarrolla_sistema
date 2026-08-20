// Escalera de carga: sube la presion por pasos y se detiene en cuanto aparecen
// fallos. El objetivo NO es romper la app — es encontrar el ultimo punto donde
// aguanta, que es el unico numero comparable entre corridas.
//
//   npm run simulate:ladder
//   LT_LADDER_MAX_ERROR_PCT=2 npm run simulate:ladder
//   LT_LADDER_STEPS="1:120:6,2:180:8,4:180:12" npm run simulate:ladder
//
// Formato de cada paso: arrivalRate:durationSec:pagesPerSession

const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const ROOT = path.join(__dirname, "..")
const RAW_DIR = path.join(config.reportsDir, "raw")

// Por defecto sube despacio: el interes esta en el ultimo paso limpio, no en
// llegar rapido al colapso.
const DEFAULT_STEPS = "1:120:6,2:180:8,4:180:12,8:180:12"
const MAX_ERROR_PCT = Number(process.env.LT_LADDER_MAX_ERROR_PCT || 5)
const PAUSE_SEC = Number(process.env.LT_LADDER_PAUSE_SEC || 20)

function parseSteps(spec) {
  return spec.split(",").map((raw, i) => {
    const [rate, duration, pages] = raw.trim().split(":").map(Number)
    if (!rate || !duration || !pages) {
      console.error(
        `error: paso ${i + 1} malformado ("${raw}"). Formato: arrivalRate:durationSec:pagesPerSession`,
      )
      process.exit(1)
    }
    return { n: i + 1, rate, duration, pages }
  })
}

function runStep(step) {
  const label = `ladder-r${step.rate}`
  const env = {
    ...process.env,
    LT_HTTP_ARRIVAL_RATE: String(step.rate),
    LT_HTTP_DURATION_SEC: String(step.duration),
    LT_PAGES_PER_SESSION: String(step.pages),
    LT_OUTPUT_LABEL: label,
  }
  try {
    execFileSync("node", ["scripts/run-http.js"], { cwd: ROOT, stdio: "inherit", env })
  } catch {
    // run-http.js ya explica que un umbral 'ensure' incumplido no invalida el JSON.
  }
  return path.join(RAW_DIR, `21-http-user-session-${label}.json`)
}

function readResult(file) {
  if (!fs.existsSync(file)) return null
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
  const c = (data.aggregate && data.aggregate.counters) || {}
  const rt = ((data.aggregate && data.aggregate.summaries) || {})["http.response_time"] || {}
  const created = c["vusers.created"] || 0
  const failed = c["vusers.failed"] || 0
  return {
    file,
    created,
    failed,
    completed: c["vusers.completed"] || 0,
    requests: c["http.requests"] || 0,
    errorPct: created ? (failed / created) * 100 : 0,
    p95: Math.round(rt.p95 || 0),
    p99: Math.round(rt.p99 || 0),
  }
}

function sleepSync(sec) {
  if (sec <= 0) return
  console.log(`\n… dejando respirar la app ${sec}s antes del siguiente paso\n`)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sec * 1000)
}

function main() {
  const steps = parseSteps(process.env.LT_LADDER_STEPS || DEFAULT_STEPS)
  fs.mkdirSync(RAW_DIR, { recursive: true })

  console.log("=".repeat(70))
  console.log(" ESCALERA DE CARGA — busca el techo, no lo rompe")
  console.log("=".repeat(70))
  console.log(
    ` Pasos            : ${steps.map((s) => `${s.rate}/s×${s.duration}s×${s.pages}p`).join("  →  ")}`,
  )
  console.log(` Corta si el error supera : ${MAX_ERROR_PCT}%`)
  console.log(` Pausa entre pasos        : ${PAUSE_SEC}s`)
  console.log(` Target                   : ${config.targetUrl}`)
  console.log("")
  console.log(" Cada paso deja su propio JSON en reports/raw/, así que puedes")
  console.log(" comparar los pasos entre sí con: npm run report <archivo>")
  console.log("=".repeat(70))

  const results = []
  let ceiling = null

  for (const step of steps) {
    console.log("\n" + "─".repeat(70))
    console.log(
      `PASO ${step.n}/${steps.length} — ${step.rate} usuarios/s · ${step.duration}s · ${step.pages} páginas por sesión`,
    )
    console.log("─".repeat(70) + "\n")

    const outFile = runStep(step)
    const r = readResult(outFile)

    if (!r) {
      console.error(`\n! El paso ${step.n} no dejó resultado legible. Se detiene la escalera.`)
      break
    }

    const verdict = r.errorPct <= MAX_ERROR_PCT ? "OK" : "SUPERA EL UMBRAL"
    results.push({ ...step, ...r, verdict })
    console.log(
      `\n>>> PASO ${step.n}: ${r.created} usuarios · ${r.failed} fallidos (${r.errorPct.toFixed(1)}%) · p95 ${r.p95} ms — ${verdict}`,
    )

    if (r.errorPct > MAX_ERROR_PCT) {
      console.log(
        `\n>>> Techo encontrado. El último paso limpio fue ${ceiling ? `${ceiling.rate} usuarios/s` : "ninguno"}.`,
      )
      break
    }
    ceiling = { ...step, ...r }

    if (step.n < steps.length) sleepSync(PAUSE_SEC)
  }

  console.log("\n" + "=".repeat(70))
  console.log(" RESUMEN")
  console.log("=".repeat(70))
  console.log("")
  console.log(" Paso | Usuarios/s | Fallidos | % error | p95     | Veredicto")
  console.log(" -----|------------|----------|---------|---------|----------")
  for (const r of results) {
    console.log(
      ` ${String(r.n).padEnd(4)} | ${String(r.rate).padEnd(10)} | ${String(r.failed).padEnd(8)} | ${(r.errorPct.toFixed(1) + "%").padEnd(7)} | ${(r.p95 + " ms").padEnd(7)} | ${r.verdict}`,
    )
  }
  console.log("")

  if (ceiling) {
    console.log(` Techo sostenible en esta máquina: **${ceiling.rate} usuarios/s**`)
    console.log(
      ` (${ceiling.created} usuarios, ${ceiling.errorPct.toFixed(1)}% de error, p95 ${ceiling.p95} ms)`,
    )
  } else {
    console.log(" Ningún paso quedó bajo el umbral. Empieza más abajo:")
    console.log(' LT_LADDER_STEPS="0.5:120:4,1:120:6" npm run simulate:ladder')
  }
  console.log("")
  console.log(" Recordatorio: esta máquina corre la app Y el generador de carga a la vez,")
  console.log(" así que este techo es un piso, no la capacidad de producción.")
  console.log(" Para medirla de verdad, ver TARGET-REMOTO.md")
  console.log("=".repeat(70))
}

main()
