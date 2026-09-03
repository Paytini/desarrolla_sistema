import { Pool } from "pg"
import { uploadPrivateFile } from "../src/lib/supabase-storage"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN as string

async function fetchBlobBytes(url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${BLOB_TOKEN}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer de Blob: ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function migrateLogos() {
  const { rows } = await pool.query(
    `SELECT id, logo_url FROM companies WHERE logo_url LIKE '%vercel-storage.com%'`,
  )
  console.log(`Logos a migrar: ${rows.length}`)
  for (const row of rows) {
    try {
      const bytes = await fetchBlobBytes(row.logo_url)
      const path = `logos/${row.id}/${Date.now()}.png`
      const url = await uploadPrivateFile(path, bytes, "image/png")
      await pool.query(`UPDATE companies SET logo_url = $1 WHERE id = $2`, [url, row.id])
      console.log(`  ${row.id} -> ${url}`)
    } catch (err) {
      console.error(`  FALLO ${row.id}:`, err instanceof Error ? err.message : err)
    }
  }
}

async function migrateSignatures() {
  const { rows } = await pool.query(
    `SELECT wp_course_id, instructor_signature_url FROM course_dc3_metadata WHERE instructor_signature_url LIKE '%vercel-storage.com%'`,
  )
  console.log(`Firmas a migrar: ${rows.length}`)
  for (const row of rows) {
    try {
      const bytes = await fetchBlobBytes(row.instructor_signature_url)
      const path = `signatures/instructors/${row.wp_course_id}/${Date.now()}.png`
      const url = await uploadPrivateFile(path, bytes, "image/png")
      await pool.query(
        `UPDATE course_dc3_metadata SET instructor_signature_url = $1 WHERE wp_course_id = $2`,
        [url, row.wp_course_id],
      )
      console.log(`  curso ${row.wp_course_id} -> ${url}`)
    } catch (err) {
      console.error(`  FALLO curso ${row.wp_course_id}:`, err instanceof Error ? err.message : err)
    }
  }
}

async function migrateDc3Pdfs() {
  const { rows } = await pool.query(
    `SELECT c.id, c.dc3_pdf_url, e.company_id, c.employee_id
     FROM certificates c JOIN employees e ON e.id = c.employee_id
     WHERE c.dc3_pdf_url LIKE '%vercel-storage.com%'`,
  )
  console.log(`PDFs DC-3 a migrar: ${rows.length}`)
  for (const row of rows) {
    try {
      const bytes = await fetchBlobBytes(row.dc3_pdf_url)
      const path = `constancias/${row.company_id}/${row.employee_id}/dc3-${row.id}.pdf`
      const url = await uploadPrivateFile(path, bytes, "application/pdf")
      await pool.query(`UPDATE certificates SET dc3_pdf_url = $1 WHERE id = $2`, [url, row.id])
      console.log(`  ${row.id} -> ${url}`)
    } catch (err) {
      console.error(`  FALLO ${row.id}:`, err instanceof Error ? err.message : err)
    }
  }
}

async function main() {
  await migrateLogos()
  await migrateSignatures()
  await migrateDc3Pdfs()
  await pool.end()
  console.log("Migracion completa.")
}

main().catch((err) => {
  console.error("FALLO:", err)
  process.exit(1)
})
