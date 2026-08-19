# UUID Primary Keys — Seeders & Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the UUID primary-key migration by fixing the one seeder bug the schema change exposed, proving the full seeding pipeline works end-to-end against the live migrated database, and handing off a ready-to-execute manual UI smoke-test checklist for the parts that require a real authenticated browser session.

**Architecture:** This is the fourth and final sub-plan of the UUID migration (see spec §10). Plans 1-3 already converted the schema, `lib/`, and `app/` layers — this plan does not touch any of that application code. It has exactly one code change (a determinism bug in a load-testing seeder, caused indirectly by the PK type change) and one execution/verification pass against the real Supabase dev database, which — confirmed via `npx prisma migrate status` — already has the UUID schema applied and is currently empty (the migration truncated it, per spec §6).

**Tech Stack:** Prisma 7 + `@prisma/adapter-pg` (app-side seeding via `prisma/seed.ts`), raw `pg` driver + CommonJS scripts (`load-testing/seeders/*.js`, untyped — TypeScript provides no safety net here per spec §7).

**Spec:** `docs/superpowers/specs/2026-08-18-random-uuid-ids-design.md` (binding authority — see §6 "truncate + rebuild", §7 "load-testing/seeders/*.js" bullet, §8 "Verification approach").

## Global Constraints

- Every portal-entity ID (`companyId`/`empresaId`, `employeeId`/`empleadoId`, etc.) is now `string` (UUID v4, DB-generated via `gen_random_uuid()`); every `wp_*` column stays `number` — do not touch WordPress-domain IDs anywhere in this plan.
- `load-testing/seeders/*.js` is CommonJS and untyped — `npx tsc --noEmit` provides zero safety net for it. The only verification is actually running the scripts against a real database and checking the output.
- This plan must not leave synthetic load-testing data (`lt-%` namespaced companies/emails) lingering in the shared dev database after Task 1 completes — `load-testing/seeders/99-teardown.js` must be run as part of the task's own verification, not left for later.
- `prisma/seed.ts`'s demo accounts (`admin@desarrolla360.com` / `rh@empresa-demo.com` / `empleado@empresa-demo.com`) are namespaced separately (`empresa-demo-logistics` / `@empresa-demo.com`) and are NOT touched by teardown — they are meant to be left in the database, since the manual smoke-test checklist (this plan's final deliverable) uses them for login.

---

## Task 1: Fix seeder ID-ordering bug and verify the full seeding pipeline end-to-end

**Files:**
- Modify: `load-testing/seeders/03-seed-employees.js:45`

**Interfaces:**
- Consumes: the live Supabase dev database, already migrated to the UUID schema (confirmed via `npx prisma migrate status` → "Database schema is up to date!"), currently empty (confirmed via `node load-testing/seeders/00-verify-connection.js` → all counts 0).
- Produces: a verified-working seeding pipeline, and a live-populated demo dataset (via `prisma/seed.ts`, left in the database — not synthetic/namespaced, not touched by teardown) that the plan's manual smoke-test checklist (below, not an SDD task) logs into.

### Background: the bug

`load-testing/seeders/03-seed-employees.js` seeds employees for each synthetic company, then reads them back to deterministically assign course progress and certificates:

```js
const ids = await query(`SELECT id, email, wp_user_id FROM employees WHERE company_id = $1 AND email LIKE $2 ORDER BY id`, [company.id, `emp%-${company.slug}@${emails.DOMAIN}`])
```

Before this migration, `employees.id` was `Int @default(autoincrement())`, so `ORDER BY id` returned rows in insertion order — which matched the order `emails.employeeEmail(company.slug, i + 1)` assigned emails (`emp001-...`, `emp002-...`, etc.), making the subsequent `idx`-based progress/completion assignment (line 48 in the current file: `ids.rows.forEach((emp, idx) => { ... })`) deterministic and reproducible across runs.

Now `employees.id` is `String @default(dbgenerated("gen_random_uuid()")) @db.Uuid` — a random UUID v4 carries no ordering relationship to insertion order. `ORDER BY id` now returns employees in an effectively random order every run, so the same employee gets a different progress/completion/certificate assignment on every re-seed. This doesn't corrupt data (any employee can validly get any course-progress row), but it defeats the seeder's own purpose: reproducible, inspectable load-test fixtures.

### Fix

The email format is already deterministic and zero-padded (`load-testing/seeders/lib/emails.js:19`: `` `emp${String(n).padStart(3, "0")}-${slug}@${DOMAIN}` ``, 3-digit padding), and `config.scale.employeesPerCompany` defaults to 200 (well under the 999 the 3-digit padding supports — confirmed via `load-testing/config.js:18`). Lexicographic sort on `email` therefore matches numeric insertion order. Order by `email` instead of `id`:

- [ ] **Step 1: Apply the fix**

In `load-testing/seeders/03-seed-employees.js`, change line 45 from:

```js
    const ids = await query(`SELECT id, email, wp_user_id FROM employees WHERE company_id = $1 AND email LIKE $2 ORDER BY id`, [company.id, `emp%-${company.slug}@${emails.DOMAIN}`])
```

to:

```js
    const ids = await query(`SELECT id, email, wp_user_id FROM employees WHERE company_id = $1 AND email LIKE $2 ORDER BY email`, [company.id, `emp%-${company.slug}@${emails.DOMAIN}`])
```

(Only the `ORDER BY` clause changes — the rest of the query, and everything downstream that consumes `ids.rows`, is untouched.)

- [ ] **Step 2: Run the full seeding pipeline against the live dev database, at reduced scale**

This repo has no test suite (confirmed in `CLAUDE.md`) — the seeder's own "test cycle" is running it against a real database and inspecting the result. Use a small scale to keep this fast and easy to fully clean up:

```bash
cd load-testing
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=5 node seeders/00-verify-connection.js
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=5 node seeders/01-seed-catalog.js
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=5 node seeders/02-seed-companies.js
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=5 node seeders/03-seed-employees.js
LT_COMPANIES=2 LT_EMPLOYEES_PER_COMPANY=5 node seeders/04-generate-csv.js
```

Expected: all five scripts complete with exit code 0 and no thrown errors. `03-seed-employees.js` should print `OK empleados: 10, certificados: <N>` (2 companies × 5 employees).

- [ ] **Step 3: Verify UUID defaults fired correctly on every raw-SQL insert path**

This is the single highest-risk item from spec §4: `load-testing/seeders/lib/db.js`'s `bulkInsert` and the raw `INSERT` statements in `01-seed-catalog.js`/`02-seed-companies.js` never include an `id` column in their column list, so every row's `id` depends entirely on Postgres's column-level `DEFAULT gen_random_uuid()` firing (the reason the spec rejected `@default(uuid())`, which is Prisma-Client-side only and would leave these `id` columns NULL). Confirm directly:

```bash
node -e "
const { query, getPool } = require('./seeders/lib/db');
(async () => {
  const tables = ['companies', 'packages', 'employees', 'employee_courses', 'certificates', 'package_courses'];
  for (const t of tables) {
    const r = await query(\`SELECT id FROM \${t} WHERE id IS NULL\`);
    console.log(\`\${t}: \${r.rowCount} NULL ids\`);
  }
  const uuidCheck = await query(\`SELECT id FROM employees LIMIT 1\`);
  console.log('sample employee id:', uuidCheck.rows[0]?.id, typeof uuidCheck.rows[0]?.id);
  await getPool().end();
})();
"
```

Expected: every table prints `0 NULL ids`, and the sample employee id is a well-formed UUID string (e.g. `a1b2c3d4-...`), confirming the DB-level default fired on every raw-SQL insert path.

- [ ] **Step 4: Verify the ordering fix produced deterministic, reproducible per-employee assignment**

```bash
node -e "
const { query, getPool } = require('./seeders/lib/db');
(async () => {
  const r = await query(\`
    SELECT e.email, ec.wp_course_id, ec.progress_pct, ec.completed
    FROM employee_courses ec
    JOIN employees e ON e.id = ec.employee_id
    WHERE e.email LIKE 'emp%-lt-empresa-01@%'
    ORDER BY e.email, ec.wp_course_id
  \`);
  console.log(JSON.stringify(r.rows, null, 1));
  await getPool().end();
})();
"
```

Expected: rows print in `emp001-...`, `emp002-...`, ... order (matching the email's numeric suffix), and the `progress_pct`/`completed` values match the deterministic formula in `03-seed-employees.js` (`(idx * 7 + c * 23) % 101`, where `idx` is the employee's zero-based position — `emp001` is `idx=0`, `emp002` is `idx=1`, etc.). Re-running Steps 2-4 a second time should reproduce identical `progress_pct`/`completed` values for the same email (the `id`s will differ since they're regenerated, but the assignment logic is deterministic given the same `idx`).

- [ ] **Step 5: Verify referential integrity across the FK chain**

```bash
node -e "
const { query, getPool } = require('./seeders/lib/db');
(async () => {
  const orphans = await query(\`
    SELECT
      (SELECT count(*) FROM employees e LEFT JOIN companies c ON c.id = e.company_id WHERE c.id IS NULL AND e.email LIKE '%lt-empresa%')::int AS orphan_employees,
      (SELECT count(*) FROM employee_courses ec LEFT JOIN employees e ON e.id = ec.employee_id WHERE e.id IS NULL)::int AS orphan_courses,
      (SELECT count(*) FROM certificates cert LEFT JOIN employees e ON e.id = cert.employee_id WHERE e.id IS NULL)::int AS orphan_certs
  \`);
  console.log(orphans.rows[0]);
  await getPool().end();
})();
"
```

Expected: `{ orphan_employees: 0, orphan_courses: 0, orphan_certs: 0 }` — every FK column correctly holds a UUID that resolves to a real parent row.

- [ ] **Step 6: Clean up the synthetic load-testing data**

Per this plan's Global Constraints, don't leave `lt-%` data in the shared dev database:

```bash
node seeders/99-teardown.js
```

Expected: prints a deletion count per table, ends with `residuo namespace: 0` and exit code 0 (the script itself `process.exit(1)`s if any residue remains — a non-zero exit here means teardown's own DELETE patterns need investigation before this task can be considered done).

- [ ] **Step 7: Confirm the dev database is back to empty (except this plan's own upcoming demo seed)**

```bash
node seeders/00-verify-connection.js
```

Expected: all counts back to 0, `companies namespaced lt-: 0`.

- [ ] **Step 8: Seed the demo accounts used by the manual smoke-test checklist**

This is the real (non-synthetic, non-namespaced) seed the rest of this plan's manual checklist depends on:

```bash
cd ..
npx tsx prisma/seed.ts
```

Expected: prints the three `✅ ... creado` lines (SuperAdmin, RH demo, Empleado demo) with no errors.

- [ ] **Step 9: Verify the demo seed's UUID/folio correctness directly**

```bash
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const r = await pool.query(\`
    SELECT c.folio_sequence, c.reference_number, c.employee_id, e.id AS emp_id, e.company_id, comp.id AS comp_id
    FROM certificates c
    JOIN employees e ON e.id = c.employee_id
    JOIN companies comp ON comp.id = e.company_id
    WHERE c.reference_number = 'D360-2026-0416-001'
  \`);
  console.log(r.rows[0]);
  await pool.end();
})();
"
```

Expected: one row, `folio_sequence` is a positive integer (Postgres's `autoincrement()` default fired even though `prisma/seed.ts` never sets this column explicitly), `c.employee_id === e.emp_id` and `e.company_id === comp.comp_id` (both well-formed UUID strings, confirming the FK chain resolves correctly through Prisma Client's insert path too — Task 1 Step 3 already confirmed this for the raw-SQL path, this confirms the Prisma-Client path).

- [ ] **Step 10: Commit**

```bash
git add load-testing/seeders/03-seed-employees.js
git commit -m "fix(load-testing): order employee readback by email, not id, for deterministic seeding under UUID PKs"
```

(Nothing else changes — Steps 2-9 are verification against the live database, not code changes. The demo data seeded in Step 8 lives in the database, not in this commit.)

---

## Manual smoke-test checklist (not an SDD task — requires a human)

Spec §8 also calls for: "login as all 3 roles, view a company, view/download a certificate ..., upload a company logo and an instructor signature ..., trigger a package sync ..., edit DC-3 metadata ...". `auth.ts` calls `verifyTurnstileToken` unconditionally against Cloudflare's real `siteverify` endpoint whenever `TURNSTILE_SECRET_KEY` is set (confirmed by reading `lib/turnstile.ts` — no dev/test bypass exists), and the `.env` in this worktree has real, non-test Cloudflare Turnstile keys configured, so logging in against *that* running instance cannot be scripted from an agent session without a real browser and a human solving the captcha.

That said, this repo already ships infrastructure to sidestep this for exactly this kind of scripted check: `load-testing/.env.app.example` configures Cloudflare's official "always pass" Turnstile test keys, and `load-testing/scripts/check-target.js` already uses them to log in as all 3 roles through `/api/auth/callback/credentials`, asserting `session.user.rol`/`empresa_slug` on each — which is essentially checklist item 1 below, already implemented. Items 2-3 could plausibly be automated the same way (script an authenticated fetch against the relevant routes once logged in via the test keys). But *using* that bypass means booting the app under permissive, non-production captcha keys — a security-relevant configuration choice, and not one this plan makes unilaterally on the user's behalf. So rather than wiring that up, this plan hands the checklist below to a human to run against the app's real configuration; if the user wants items 1-3 automated via the test-key path instead, that's a separate decision to make explicitly.

Everything Task 1 verified programmatically (UUID defaults firing on every insert path, FK integrity, folio_sequence auto-assignment) does not need to be re-checked by hand. What a human still needs to click through, using the demo accounts Task 1 Step 8 just seeded (`admin@desarrolla360.com` / `admin123`, `rh@empresa-demo.com` / `rh123456`, `empleado@empresa-demo.com` / `empleado123`), after running `npm run dev` in this worktree:

The order below is not the order spec §8 lists items in — it's been rearranged so each step's prerequisites are satisfied by an earlier step. In particular, downloading the certificate (item 5) triggers DC-3 PDF generation, which throws `Dc3MissingFieldsError` (422, `app/api/certificates/[id]/dc3/route.ts`) unless `curso_dc3_metadata` has `duration_hours`, `subject_area_name`, `training_agent_name`, `instructor_name`, and `instructor_signature_url` all populated — and the seeded demo data (`prisma/seed.ts`) has zero rows in `course_dc3_metadata`. So the metadata-edit and signature-upload steps must run first.

1. **Login as all 3 roles** — confirms NextAuth's session/JWT layer round-trips the UUID `user.id` correctly post-migration (spec §7 already confirmed this needs no code change, since `auth.ts` already carries `user.id` as a string end-to-end — this step is the live confirmation of that claim).
2. **SUPERADMIN → `/superadmin/companies/{id}`** — view "Empresa Demo Logistics". Confirms the UUID route param resolves correctly (`isUuid()` guard added in PR #15's fix wave).
3. **SUPERADMIN → edit DC-3 metadata for a course** (`/superadmin/dc3`) — fill in `duration_hours`, `subject_area_name`, `training_agent_name`, `instructor_name`. Confirm the change is reflected immediately (cache invalidation via `lib/cache-tags.ts` still matches on the new UUID-keyed tags). This also creates the metadata row that item 5 (certificate download) needs.
4. **SUPERADMIN → upload a company logo** (`/superadmin/companies/{id}`) and **upload an instructor signature** (wherever `curso_dc3_metadata` is edited, `/superadmin/dc3`). Confirms both `app/api/upload/company-logo/route.ts` (the route Plan 3 fixed for FormData UUID parsing) and `app/api/upload/instructor-signature/route.ts` accept the UUID company/course IDs correctly. The signature upload is also a prerequisite for item 5 — DC-3 generation needs `instructor_signature_url` populated.
5. **SUPERADMIN or RH → download the seeded certificate** (`D360-2026-0416-001`, reference-number search or via the employee's certificate list). Depends on items 3-4 having been done first: the seeded certificate's `certificate_url` is a fabricated external URL and `dc3_pdf_url` is null, so nothing pre-exists in Blob storage for this step to resolve. Instead, this step exercises the *generate-and-upload* path — the DC-3 PDF gets built from `curso_dc3_metadata` and uploaded to Vercel Blob (`` `constancias/${companyId}/${employeeId}/dc3-${certificateId}.pdf` ``) for the first time — and confirms the certificate's `folio_sequence` (verified in Task 1 Step 9) surfaces correctly wherever the UI displays the folio.
6. **SUPERADMIN → assign the demo package to a second company, or trigger a re-sync on the existing assignment** (`/superadmin/packages`, or `/superadmin/reports`'s retry-sync action). This step calls the real external WordPress bridge (`lib/course-sync.ts` → `lib/wordpress-bridge.ts`); if the bridge is unreachable from the tester's machine, the job can legitimately land in an ERROR state for reasons unrelated to this migration — that alone isn't a Plans 1-3 bug. What this step actually verifies: via the `Job` table (or however the UI surfaces job state), confirm the job's payload carries `companyId` as a UUID string and `employeeIds` as a UUID array, and that the job advances past `PENDING` — that's what spec §7's `Job.payload` claim is about, not whether WordPress itself answers. This is also the only step in this whole plan that exercises spec §5's new certificate folio format end-to-end (`D360-YYYY-MMDD-{paddedFolioSequence}-{wp_course_id}`, built by `buildCertificateFolio` in `lib/employee-learning.ts`, invoked from `upsertEmployeeCertificatesFromBridge` — nothing in Task 1 exercised this, since the seeded demo certificate has a hardcoded legacy-format `reference_number` and `buildCertificateFolio` only runs as part of a real bridge sync). Glance at any certificate the sync creates to confirm its `reference_number` matches the new format.

Report back per-item pass/fail. For items 1-5, anything that fails is a real bug in Plans 1-3's work, not a Plan 4 defect, and should be triaged before considering the whole UUID migration done. For item 6, only the `Job.payload` shape and state-advancement claim is a Plans 1-3 concern — a WordPress-side ERROR is not.

**Stale regenerated data files:** Task 1's verification run regenerated `load-testing/data/companies.json`, `catalog.json`, and `payloads/*.csv` (gitignored, not committed) with UUIDs that were then deleted by the teardown step. Anyone running an `artillery` load-test scenario in this worktree without first re-running the `load-testing/seeders/01-04` pipeline will get confusing results, since those on-disk files reference rows that no longer exist in the database.
