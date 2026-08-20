const { query, getPool } = require("./lib/db")
const { TEARDOWN_EMAIL_PATTERNS } = require("./lib/emails")

// El dominio yopmail.com por si solo NUNCA es criterio de borrado: un usuario
// real podria usarlo. Se exige el patron completo (marcador lt-empresa /
// lt-import + dominio), expandido aqui como una lista de LIKE combinados con OR.
const EMAIL_MATCH = TEARDOWN_EMAIL_PATTERNS.map((_, i) => `email LIKE $${i + 1}`).join(" OR ")
const P = TEARDOWN_EMAIL_PATTERNS

const seededUsers = `SELECT id FROM users WHERE ${EMAIL_MATCH}`
const seededEmployees = `SELECT id FROM employees WHERE ${EMAIL_MATCH}`
const seededCompanies = `SELECT id FROM companies WHERE slug LIKE 'lt-%'`

const STEPS = [
  ["notifications", `DELETE FROM notifications WHERE user_id IN (${seededUsers})`, true],
  ["certificates", `DELETE FROM certificates WHERE employee_id IN (${seededEmployees})`, true],
  [
    "employee_courses",
    `DELETE FROM employee_courses WHERE employee_id IN (${seededEmployees})`,
    true,
  ],
  ["employees", `DELETE FROM employees WHERE ${EMAIL_MATCH}`, true],
  ["portal_sessions", `DELETE FROM portal_sessions WHERE user_id IN (${seededUsers})`, true],
  [
    "consulting_requests",
    `DELETE FROM consulting_requests WHERE requested_by_user_id IN (${seededUsers}) OR company_id IN (${seededCompanies})`,
    true,
  ],
  ["users", `DELETE FROM users WHERE ${EMAIL_MATCH}`, true],
  ["audit_events", `DELETE FROM audit_events WHERE company_id IN (${seededCompanies})`, false],
  ["seat_history", `DELETE FROM seat_history WHERE company_id IN (${seededCompanies})`, false],
  [
    "company_packages",
    `DELETE FROM company_packages WHERE company_id IN (${seededCompanies})`,
    false,
  ],
  ["companies", `DELETE FROM companies WHERE slug LIKE 'lt-%'`, false],
  [
    "package_courses",
    `DELETE FROM package_courses WHERE package_id IN (SELECT id FROM packages WHERE name LIKE 'LT %')`,
    false,
  ],
  [
    "company_packages(pkg)",
    `DELETE FROM company_packages WHERE package_id IN (SELECT id FROM packages WHERE name LIKE 'LT %')`,
    false,
  ],
  [
    "course_dc3_metadata",
    `DELETE FROM course_dc3_metadata WHERE wp_course_id BETWEEN 900101 AND 900199`,
    false,
  ],
  ["packages", `DELETE FROM packages WHERE name LIKE 'LT %'`, false],
]

async function main() {
  for (const [label, sql, needsParams] of STEPS) {
    const r = needsParams ? await query(sql, P) : await query(sql)
    console.log(`${label}: ${r.rowCount} borrados`)
  }

  const residue = await query(
    `SELECT (SELECT count(*) FROM companies WHERE slug LIKE 'lt-%')::int
          + (SELECT count(*) FROM users WHERE ${EMAIL_MATCH})::int
          + (SELECT count(*) FROM employees WHERE ${EMAIL_MATCH})::int AS n`,
    P,
  )
  console.log(`residuo namespace: ${residue.rows[0].n}`)
  if (residue.rows[0].n !== 0) process.exit(1)
  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
