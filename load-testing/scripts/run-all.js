const { execSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const config = require("../config")

const SCENARIOS = [
  "01-login-storm", "02-employee-navigation", "03-rh-journey",
  "04-superadmin-dashboard", "05-certificates", "06-peak-mixed",
]

const rawDir = path.join(config.reportsDir, "raw")
fs.mkdirSync(rawDir, { recursive: true })

execSync("node scripts/check-target.js", { cwd: path.join(__dirname, ".."), stdio: "inherit" })
for (const name of SCENARIOS) {
  const out = path.join(rawDir, `${name}.json`)
  console.log(`\n=== ${name} ===`)
  try {
    execSync(`npx artillery run artillery/${name}.yml --output "${out}"`, { cwd: path.join(__dirname, ".."), stdio: "inherit" })
  } catch {
    console.error(`${name}: umbral ensure fallo (el JSON se genero igual, continua)`)
  }
}
execSync("node scripts/summarize.js", { cwd: path.join(__dirname, ".."), stdio: "inherit" })
