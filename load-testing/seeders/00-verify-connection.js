const { query, getPool } = require("./lib/db")

async function main() {
  const tables = [
    "users",
    "companies",
    "employees",
    "employee_courses",
    "certificates",
    "packages",
    "package_courses",
    "company_packages",
    "course_dc3_metadata",
  ]
  for (const t of tables) {
    const r = await query(`SELECT count(*)::int AS n FROM ${t}`)
    console.log(`${t}: ${r.rows[0].n}`)
  }
  const lt = await query(`SELECT count(*)::int AS n FROM companies WHERE slug LIKE 'lt-%'`)
  console.log(`companies namespaced lt-: ${lt.rows[0].n}`)
  await getPool().end()
  console.log("OK: conexion y tablas verificadas")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
