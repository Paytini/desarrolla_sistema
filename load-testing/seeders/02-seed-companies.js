const fs = require("node:fs")
const path = require("node:path")
const bcrypt = require("bcryptjs")
const { query, getPool } = require("./lib/db")
const names = require("./lib/names")
const emails = require("./lib/emails")
const config = require("../config")

async function main() {
  const catalog = JSON.parse(fs.readFileSync(path.join(config.dataDir, "catalog.json")))
  const hash = await bcrypt.hash(config.seededPassword, 12)
  const out = []
  for (let i = 0; i < config.scale.companies; i++) {
    const slug = `${config.namespace.slugPrefix}empresa-${String(i + 1).padStart(2, "0")}`
    const rhEmail = emails.rhEmail(slug)
    const seats = config.scale.employeesPerCompany + 10
    const rfc = `LTE${String(i + 1).padStart(2, "0")}0101AB1`
    const company = await query(
      `INSERT INTO companies (name, slug, hr_email, rfc, contracted_seats, used_seats, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 0, true, now(), now())
       ON CONFLICT (slug) DO UPDATE SET contracted_seats = $5, rfc = $4 RETURNING id`,
      [names.companyName(i), slug, rhEmail, rfc, seats],
    )
    const companyId = company.rows[0].id
    await query(
      `INSERT INTO users (email, password_hash, role, name, company_id, active, created_at, updated_at)
       VALUES ($1, $2, 'RH', $3, $4, true, now(), now()) ON CONFLICT (email) DO NOTHING`,
      [rhEmail, hash, `RH ${names.companyName(i)}`, companyId],
    )
    const cp = await query(
      `SELECT id FROM company_packages WHERE company_id = $1 AND package_id = $2 AND active`,
      [companyId, catalog.packageId],
    )
    if (cp.rows.length === 0) {
      await query(
        `INSERT INTO company_packages (company_id, package_id, start_date, active, created_at) VALUES ($1, $2, now(), true, now())`,
        [companyId, catalog.packageId],
      )
    }
    out.push({ id: companyId, slug, rhEmail })
  }
  fs.mkdirSync(path.join(config.dataDir, "payloads"), { recursive: true })
  fs.writeFileSync(path.join(config.dataDir, "companies.json"), JSON.stringify(out, null, 1))
  const csv = [
    "email,password,slug",
    ...out.map((c) => `${c.rhEmail},${config.seededPassword},${c.slug}`),
  ].join("\n")
  fs.writeFileSync(path.join(config.dataDir, "payloads", "rh-credentials.csv"), csv)
  console.log(`OK empresas: ${out.length}`)
  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
