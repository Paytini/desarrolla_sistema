const { Pool } = require("pg")
const config = require("../../config")

let pool
function getPool() {
  if (!pool) pool = new Pool({ connectionString: config.dbUrl, max: 4 })
  return pool
}

async function query(sql, params) {
  return getPool().query(sql, params)
}

// INSERT multi-fila parametrizado: bulkInsert("employees", ["company_id","email"], [[1,"a"],[2,"b"]], "ON CONFLICT (email) DO NOTHING")
async function bulkInsert(table, columns, rows, conflictClause = "") {
  if (rows.length === 0) return { rowCount: 0 }
  const params = []
  const tuples = rows.map((row) => {
    const ph = row.map((v) => {
      params.push(v)
      return `$${params.length}`
    })
    return `(${ph.join(",")})`
  })
  const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES ${tuples.join(",")} ${conflictClause}`
  return getPool().query(sql, params)
}

module.exports = { getPool, query, bulkInsert }
