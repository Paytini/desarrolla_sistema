const fs = require("node:fs")
const path = require("node:path")
const names = require("./lib/names")
const emails = require("./lib/emails")
const config = require("../config")

const HEADER = "nombre,apellido,email,curp,departamento,puesto,ocupacion_especifica_clave,ocupacion_especifica,password"

function buildCsv(rows) {
  const runId = Date.now()
  const lines = [HEADER]
  for (let i = 0; i < rows; i++) {
    lines.push([names.firstName(i), names.lastName(i), emails.importEmail(runId, i), names.curp(i), "Operaciones", "Analista", "07.2", "Supervision de seguridad", config.seededPassword].join(","))
  }
  return lines.join("\n")
}

const dir = path.join(config.dataDir, "import")
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, "rh-import-20.csv"), buildCsv(20))
fs.writeFileSync(path.join(dir, "rh-import-100.csv"), buildCsv(100))
console.log("OK csv de import: rh-import-20.csv, rh-import-100.csv")
