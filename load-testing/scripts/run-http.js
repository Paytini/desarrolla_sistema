const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const rootDir = path.join(__dirname, "..")
const rawDir = path.join(config.reportsDir, "raw")
fs.mkdirSync(rawDir, { recursive: true })

const isSpike = process.argv.includes("--spike")
const scenarioRelPath = "artillery/21-http-user-session.yml"

// The .yml hardcodes target: http://localhost:3005 (safety: this suite must
// never be pointed at production from the file itself). LT_TARGET_URL lets a
// caller redirect a single run at another already-approved deployment (e.g. a
// Vercel preview) purely through --overrides, without touching the yml.
// config.targetUrl already falls back to localhost:3005 when LT_TARGET_URL is
// unset, so we only add the config.target override when the env var is
// explicitly present — otherwise the yml's own hardcoded default stands.
const targetOverride = process.env.LT_TARGET_URL || null

function buildOverrides() {
  const base = isSpike
    ? {
        config: {
          phases: [
            {
              arrivalCount: config.sim.spike.count,
              duration: config.sim.spike.durationSec,
              name: `spike-${config.sim.spike.count}-en-${config.sim.spike.durationSec}s`,
            },
          ],
        },
      }
    : {
        config: {
          phases: [
            {
              arrivalRate: config.sim.http.arrivalRate,
              duration: config.sim.http.durationSec,
              name: "sesiones-http",
            },
          ],
          variables: {
            pagesPerSession: config.sim.http.pagesPerSession,
            thinkMinSec: config.sim.http.thinkMinSec,
            thinkMaxSec: config.sim.http.thinkMaxSec,
          },
        },
      }

  if (targetOverride) {
    base.config.target = targetOverride
  }

  return base
}

const overrides = buildOverrides()
// LT_OUTPUT_LABEL permite que un orquestador (scripts/run-ladder.js) guarde el
// resultado de cada paso en su propio archivo en vez de pisar el anterior.
const outLabel = process.env.LT_OUTPUT_LABEL ? `-${process.env.LT_OUTPUT_LABEL}` : ""
const outPath = path.join(rawDir, `21-http-user-session${isSpike ? "-spike" : ""}${outLabel}.json`)

console.log("=".repeat(70))
console.log(isSpike ? "MODO SPIKE — avalancha simultanea (arrivalCount + duration)" : "MODO HTTP — sesion reutilizada (capacidad)")
console.log("=".repeat(70))
console.log(`  target:            ${config.targetUrl}${targetOverride ? "  (override via LT_TARGET_URL, inyectado en --overrides)" : "  (default del .yml, LT_TARGET_URL no definida)"}`)
if (isSpike) {
  const p = overrides.config.phases[0]
  console.log(`  arrivalCount:      ${p.arrivalCount} usuarios`)
  console.log(`  duration:          ${p.duration}s (ventana de llegada simultanea)`)
  console.log(`  env vars:          LT_SPIKE_COUNT, LT_SPIKE_DURATION_SEC`)
} else {
  const p = overrides.config.phases[0]
  const v = overrides.config.variables
  console.log(`  arrivalRate:       ${p.arrivalRate}/s`)
  console.log(`  duration:          ${p.duration}s`)
  console.log(`  pagesPerSession:   ${v.pagesPerSession} (loop count por VU)`)
  console.log(`  thinkMinSec:       ${v.thinkMinSec}`)
  console.log(`  thinkMaxSec:       ${v.thinkMaxSec}`)
  console.log(`  env vars:          LT_HTTP_ARRIVAL_RATE, LT_HTTP_DURATION_SEC, LT_PAGES_PER_SESSION, LT_THINK_MIN_SEC, LT_THINK_MAX_SEC`)
}
console.log(`  scenario file:     ${scenarioRelPath}`)
console.log(`  output:            ${outPath}`)
console.log("=".repeat(70))
console.log("  --overrides efectivo:")
console.log(`  ${JSON.stringify(overrides)}`)
console.log("=".repeat(70))

const overridesJson = JSON.stringify(overrides)

try {
  execFileSync(
    "npx",
    ["artillery", "run", scenarioRelPath, "--overrides", overridesJson, "--output", outPath],
    { cwd: rootDir, stdio: "inherit" }
  )
} catch (_err) {
  console.error("\nartillery termino con codigo distinto de 0 (probablemente un umbral 'ensure' fallo). El JSON de salida se escribe igual si la corrida llego a completarse — revisalo antes de asumir que fallo todo.")
}

console.log(`\nReporte crudo escrito en: ${outPath}`)
console.log(`Resumen legible:          npx artillery report "${outPath}"`)
