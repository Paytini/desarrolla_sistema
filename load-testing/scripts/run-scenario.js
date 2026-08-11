const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const rootDir = path.join(__dirname, "..")
const rawDir = path.join(config.reportsDir, "raw")

const name = process.argv[2]
if (!name) {
  console.error("Uso: node scripts/run-scenario.js <scenario-basename>")
  console.error("Ejemplo: node scripts/run-scenario.js 30-mass-enrollment")
  process.exit(1)
}

const scenarioRelPath = `artillery/${name}.yml`
const scenarioAbsPath = path.join(rootDir, scenarioRelPath)
if (!fs.existsSync(scenarioAbsPath)) {
  console.error(`No existe el escenario: ${scenarioRelPath}`)
  process.exit(1)
}

fs.mkdirSync(rawDir, { recursive: true })
const outPath = path.join(rawDir, `${name}.json`)

console.log(`Ejecutando ${scenarioRelPath}`)
console.log(`Salida:      ${outPath}`)

try {
  execFileSync("npx", ["artillery", "run", scenarioRelPath, "--output", outPath], {
    cwd: rootDir,
    stdio: "inherit",
  })
} catch (_err) {
  // A non-zero exit here is most often an `ensure` threshold breach, which is
  // data about the system under test, not a failure of this runner. The JSON
  // report is still written if the run itself completed, so don't propagate
  // the exit code.
  console.error(
    "\nartillery termino con codigo distinto de 0 (probable umbral 'ensure' fallido, o un error real — revisa la salida arriba). El reporte JSON se escribe igual si la corrida llego a completarse."
  )
}

console.log(`\nReporte crudo: ${outPath}`)
console.log(`Resumen legible: npx artillery report "${outPath}"`)
