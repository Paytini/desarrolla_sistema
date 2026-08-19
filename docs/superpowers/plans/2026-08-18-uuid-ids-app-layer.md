# UUID Primary Keys — Plan 3: Application Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every `app/` route, server action, and the handful of `components/` files that hold portal-entity-ID-typed props/state, so the whole application compiles cleanly against the UUID types Plan 1 (schema/DB) and Plan 2 (`lib/`) already established.

**Architecture:** Same mechanical `number` → `string` conversion as Plan 2, but with one additional research dimension this plan's authoring specifically hunted for: **client components whose props currently match a server action's old `number` signature compile cleanly today, but will break silently the moment that action is converted** — the same "tsc under-reports" lesson from Plan 2, one level further down the call graph (page/action → client component prop, not just lib → lib). Every task below lists these paired files explicitly so no implementer has to rediscover this by trial and error.

**Tech Stack:** TypeScript, Next.js 16 App Router (Server Actions, `params`/`searchParams` as Promises), MUI v9, Prisma 7 (already UUID-typed via Plans 1-2).

**Spec:** `docs/superpowers/specs/2026-08-18-random-uuid-ids-design.md`
**Prior plans:** Plan 1 (`docs/superpowers/plans/2026-08-18-uuid-ids-schema-migration.md`), Plan 2 (`docs/superpowers/plans/2026-08-18-uuid-ids-core-libs.md`)

## Global Constraints

- Every portal-entity ID (`companyId`/`empresaId`, `employeeId`/`empleadoId`, `userId`/`usuarioId`, `packageId`/`paqueteId`, `certificateId`/`constanciaId`, `requestId`, `sessionId`) changes from `number` to `string` wherever it names a value that flows into one of the 16 UUID-keyed columns from Plan 1.
- Every `wp_*`-named field, and every plain `courseId`/`wpUserId`/`wpBundleId` parameter that refers to WordPress/Tutor LMS's own numeric ID, stays `number` — verified per file below, matching Plan 1 §3 and Plan 2's established boundary.
- **Route params are already `string`** (`params: Promise<{ id: string }>`) — the bug pattern to remove everywhere is `Number(id)` / `Number.parseInt(id, 10)` immediately followed by an `Number.isInteger(...)` validity check before a DB lookup. Replace with: use `id` directly as the string, and replace the validity check with a UUID-shape regex check (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) so a malformed URL still degrades gracefully (`notFound()` / a 400 JSON response) instead of Prisma throwing a raw Postgres `22P02 invalid input syntax for type uuid` error. This exact pattern occurs in exactly 3 places (Task 1, Task 2, Task 7) — confirmed by repo-wide grep during authoring, not assumed. No shared helper module is introduced for this (only 3 call sites — a shared `lib/` helper would be premature for this plan's scope per YAGNI); each site gets its own inline check, worded identically.
- **`Number.parseInt(formData.get(...), 10)` on a portal-ID form field** is the other recurring bug pattern — every server action reads these into a small `getInt`/`getInteger`/`getRequestId`/`getPositiveInt`-style helper that must either be deleted (if it becomes unused) or left alone (if it's still legitimately used for a real numeric field, e.g. `contracted_seats`). Each task states explicitly which local helpers survive and which don't.
- `session.user.empresa_id` and `session.user.id` are `string | null` / `string` respectively as of Plan 2 — every `as number` cast on `session.user.empresa_id` becomes `as string`, and every `Number.parseInt(session.user.id, 10)` becomes just `session.user.id` (it was already a UUID string; the parseInt was already silently wrong before this migration too, in the sense of being unnecessary, but it compiled because `session.user.id`'s type was loose enough — now it doesn't).
- No test suite exists in this repo. Verification per task is `npx tsc --noEmit` (grep the task's own files out of the remaining error list) plus `npm run lint`. Given this plan's size, tasks track a **per-task-group scoped count** the same way Plan 2 learned to (whole-repo counts are unreliable while other tasks in this same plan are still in flight) — each task's Step "Verify" greps only its own files, never a running total across the whole plan, since Plan 3's tasks don't have the same strict dependency ordering Plan 2's did (verified during authoring: no task in this plan produces a type another task's files consume, except where a task explicitly says so).
- This plan does **not** touch `prisma/seed.ts` or `load-testing/`'s seeders — those are Plan 4.

---

### Task 1: Superadmin — Companies (`companies/[id]/page.tsx`, `companies/actions.ts`, `SuspendCompanyButton.tsx`)

**Files:**
- Modify: `app/(portal)/superadmin/companies/[id]/page.tsx`
- Modify: `app/(portal)/superadmin/companies/actions.ts`
- Modify: `components/superadmin/SuspendCompanyButton.tsx`

**Interfaces:**
- `SuspendCompanyButtonProps.companyId: string` — consumed by `components/superadmin/CompanyRow.tsx`, which passes `company.id` (already `string`, Prisma-inferred) — **`CompanyRow.tsx` needs no edit of its own**, its current tsc error resolves automatically once this task lands; verify this in Step 4, don't touch the file.

`companies/[id]/page.tsx` has 45 `tsc` errors — all but one (the root cause, line 95's `Number(id)`) are cascading `Property 'employees'/'packages' does not exist` / implicit-`any` errors that resolve once the root query's `where` clause type-checks. `companies/actions.ts` has 13 errors. `SuspendCompanyButton.tsx` is not `tsc`-flagged today (confirmed by grep) — it compiles cleanly against the current `number` signature; it will break the moment `companies/actions.ts`'s `toggleCompanyStatusAction` starts reading a string `empresa_id`, so it's included here rather than left for a future surprise.

- [ ] **Step 1: Edit `app/(portal)/superadmin/companies/[id]/page.tsx`**

```diff
   const { id }    = await params
-  const companyId = Number(id)
-  if (!Number.isInteger(companyId) || companyId <= 0) notFound()
+  const companyId = id
+  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) notFound()
```

No other line in this file needs a manual edit — every `company.employees`/`company.packages`/implicit-`any` callback-parameter error resolves once the `where: { id: companyId }` clause at (pre-edit) line 105 type-checks against a `string`.

- [ ] **Step 2: Edit `app/(portal)/superadmin/companies/actions.ts`**

```diff
 export async function createCompanyAction(
   _prevState: { error: string } | null,
   formData: FormData,
 ) {
   ...
-  const packageId     = packageIdRaw ? Number.parseInt(packageIdRaw, 10) : NaN
+  const packageId     = packageIdRaw || null
```

```diff
-    let assignedPackageId: number | null = null
-    if (Number.isInteger(packageId)) {
+    let assignedPackageId: string | null = null
+    if (packageId) {
       await tx.companyPackage.create({
         data: {
           company_id:       company.id,
           package_id:       packageId,
```

```diff
 export async function toggleCompanyStatusAction(formData: FormData) {
   const session = await requireSuperAdminSession()
   const actor = getAuditActorFromSession(session)

-  const companyId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)
+  const companyId = String(formData.get("empresa_id") ?? "").trim()
   if (!companyId) {
     redirect("/superadmin/companies?error=empresa")
   }
```

```diff
 export async function updateCompanyBrandingAction(formData: FormData) {
   const session = await requireSuperAdminSession()
   const actor = getAuditActorFromSession(session)

-  const companyId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)
+  const companyId = String(formData.get("empresa_id") ?? "").trim()
   const slug = slugify(getString(formData, "slug"))
```

`getPositiveInt` (the helper used for `asientos_contratados`, a genuine seat count, not an ID) is untouched — leave it exactly as-is, it's still correct.

- [ ] **Step 3: Edit `components/superadmin/SuspendCompanyButton.tsx`**

```diff
 interface SuspendCompanyButtonProps {
-  companyId: number
+  companyId: string
   active: boolean
   name: string
 }
```

The rest of the file (`formData.set("empresa_id", String(companyId))`) needs no change — `String()` on a string is already correct and was already there.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^(app/\(portal\)/superadmin/companies/\[id\]/page\.tsx|app/\(portal\)/superadmin/companies/actions\.ts|components/superadmin/(SuspendCompanyButton|CompanyRow)\.tsx)"
```
Expected: no output — this also confirms `CompanyRow.tsx`'s pre-existing error is gone without having touched it.

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/superadmin/companies/[id]/page.tsx" "app/(portal)/superadmin/companies/actions.ts" components/superadmin/SuspendCompanyButton.tsx
git commit -m "feat(uuid): convert superadmin companies page/actions and SuspendCompanyButton to string IDs"
```

---

### Task 2: Superadmin — Packages (`packages/actions.ts`, `packages/[id]/edit/page.tsx`, `PackageForm.tsx`, `DeletePackageButton.tsx`)

**Files:**
- Modify: `app/(portal)/superadmin/packages/actions.ts`
- Modify: `app/(portal)/superadmin/packages/[id]/edit/page.tsx`
- Modify: `components/superadmin/PackageForm.tsx`
- Modify: `components/superadmin/DeletePackageButton.tsx`

**Interfaces:**
- `PackageFormInitialValues.id: string`, `DeletePackageButtonProps.packageId: string` — consumed by `components/superadmin/PackageRow.tsx`, which passes `pkg.id` (already `string`). **`PackageRow.tsx` needs no edit**, verify in Step 5.

`packages/actions.ts` has 32 errors (all cascading from the `getInteger` helper's 5 call sites across 4 functions). `packages/[id]/edit/page.tsx` has 4. `PackageForm.tsx` and `DeletePackageButton.tsx` are not `tsc`-flagged today — both break the moment `packages/actions.ts`/`packages/[id]/edit/page.tsx` convert.

- [ ] **Step 1: Edit `app/(portal)/superadmin/packages/actions.ts`**

Delete the `getInteger` helper entirely (becomes dead code once its 5 call sites below are converted):
```diff
-function getInteger(value: string) {
-  const parsed = Number.parseInt(value, 10)
-  return Number.isInteger(parsed) ? parsed : NaN
-}
```

Replace all 5 of its call sites (in `updatePackageAction`, `deletePackageAction`, `assignPackageToCompanyAction` ×2, `syncPackageToCompanyEmployeesAction`) with plain string reads:
```diff
-  const packageId = getInteger(getString(formData, "package_id"))
+  const packageId = getString(formData, "package_id")
```
```diff
-  const packageId = getInteger(getString(formData, "paquete_id"))
+  const packageId = getString(formData, "paquete_id")
```
```diff
-  const companyId = getInteger(getString(formData, "empresa_id"))
-  const packageId = getInteger(getString(formData, "paquete_id"))
+  const companyId = getString(formData, "empresa_id")
+  const packageId = getString(formData, "paquete_id")
```
```diff
-  const companyId = getInteger(getString(formData, "empresa_id"))
+  const companyId = getString(formData, "empresa_id")
```

Every `if (!packageId)` / `if (!companyId || !packageId)` truthy guard already downstream of these needs no change — an empty string is falsy the same way `NaN`/`0` was. `wpBundleId`/`resolvedBundleId` (the WordPress bundle ID, `Package.wp_bundle_id`) stay `number` throughout — untouched, still parsed via the separate inline `Number.parseInt(wpBundleIdRaw, 10)` pattern that was never routed through `getInteger`.

- [ ] **Step 2: Edit `app/(portal)/superadmin/packages/[id]/edit/page.tsx`**

```diff
   const { id } = await params
-  const packageId = Number.parseInt(id, 10)
-  if (!Number.isInteger(packageId)) notFound()
+  const packageId = id
+  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packageId)) notFound()
```

No other line needs editing — the `Property 'courses' does not exist` cascading error resolves once the `where: { id: packageId }` clause type-checks.

- [ ] **Step 3: Edit `components/superadmin/PackageForm.tsx`**

```diff
 export type PackageFormInitialValues = {
-  id: number
+  id: string
   name: string
   description: string
   deliveryMode: string
   wpBundleId: number | null
   bundleName: string
   operationalNotes: string
   courses: { wp_course_id: number; title: string; thumbnail_url?: string | null }[]
 }
```
`wpBundleId` and `courses[].wp_course_id` stay `number` — untouched, WordPress domain.

- [ ] **Step 4: Edit `components/superadmin/DeletePackageButton.tsx`**

```diff
 type DeletePackageButtonProps = {
   action: (formData: FormData) => void | Promise<void>
-  packageId: number
+  packageId: string
   packageName: string
   assignedCompaniesCount: number
 }
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^(app/\(portal\)/superadmin/packages/(actions\.ts|\[id\]/edit/page\.tsx)|components/superadmin/(PackageForm|DeletePackageButton|PackageRow)\.tsx)"
```
Expected: no output — confirms `PackageRow.tsx`'s pre-existing error is gone without having touched it.

- [ ] **Step 6: Commit**

```bash
git add "app/(portal)/superadmin/packages/actions.ts" "app/(portal)/superadmin/packages/[id]/edit/page.tsx" components/superadmin/PackageForm.tsx components/superadmin/DeletePackageButton.tsx
git commit -m "feat(uuid): convert superadmin packages actions/page and PackageForm/DeletePackageButton to string IDs"
```

---

### Task 3: Superadmin — Consulting, Access, Reports, Dashboard widgets

**Files:**
- Modify: `app/(portal)/superadmin/consulting/actions.ts`
- Modify: `components/superadmin/ConsultingRequestActions.tsx`
- Modify: `app/(portal)/superadmin/access/actions.ts`
- Modify: `components/superadmin/AccessTabs.tsx`
- Modify: `app/(portal)/superadmin/reports/actions.ts`
- Modify: `components/superadmin/ActivityFeed.tsx`
- Modify: `components/superadmin/RenewalsTable.tsx`
- Modify: `components/superadmin/OccupancyCard.tsx`

**Interfaces:**
- `AccessTabs.tsx`'s `HrAccessRow.id`/`EmployeeAccessRow.id: string` — consumed by `app/(portal)/superadmin/access/page.tsx`, which builds these objects from Prisma-inferred data (already `string`) — **`access/page.tsx` needs no edit**, its 2 current errors resolve automatically; verify in Step 6.
- `ActivityFeed.tsx`/`RenewalsTable.tsx`/`OccupancyCard.tsx`'s `id: string` fields — consumed by `app/(portal)/superadmin/page.tsx`, which passes Prisma-inferred data directly — **`superadmin/page.tsx` needs no edit**, its 3 current errors resolve automatically; verify in Step 6.

`superadmin/consulting/actions.ts` has 8 errors, `ConsultingRequestActions.tsx` is not flagged (breaks once consulting/actions.ts converts). `superadmin/access/actions.ts` has 2 errors, `AccessTabs.tsx` is not flagged (its 2 local type defs are exactly what `access/page.tsx`'s 2 current errors are about — fixing `AccessTabs.tsx` is what actually resolves them). `superadmin/reports/actions.ts` has 6 errors. `ActivityFeed.tsx`/`RenewalsTable.tsx`/`OccupancyCard.tsx` are not flagged individually (their 1-field type mismatches are what `superadmin/page.tsx`'s 3 errors report against).

- [ ] **Step 1: Edit `app/(portal)/superadmin/consulting/actions.ts`**

```diff
-function getRequestId(formData: FormData) {
-  return Number.parseInt(String(formData.get("request_id") ?? "0"), 10)
-}
+function getRequestId(formData: FormData) {
+  return String(formData.get("request_id") ?? "").trim()
+}
```

No other line in this file changes — `requestId` flows into `where: { id: requestId }` and `entityId`/`entidadId` fields, all of which resolve once its own type is `string`.

- [ ] **Step 2: Edit `components/superadmin/ConsultingRequestActions.tsx`**

```diff
 type ConsultingRequestActionsProps = {
-  requestId: number
+  requestId: string
   areaLabel: string
   companyName: string
   preferredDate: string
   preferredTime: string
 }
```

- [ ] **Step 3: Edit `app/(portal)/superadmin/access/actions.ts`**

```diff
-function getInt(formData: FormData, key: string) {
-  return Number.parseInt(String(formData.get(key) ?? "0"), 10)
-}
+function getInt(formData: FormData, key: string) {
+  return String(formData.get(key) ?? "").trim()
+}
```

(Function kept, only its body and effective return type change — renaming it would touch more call sites than necessary for no benefit; a future cleanup pass can rename it, out of scope here.) No other line in this file changes.

- [ ] **Step 4: Edit `components/superadmin/AccessTabs.tsx`**

```diff
 export type HrAccessRow = {
-  id: number
+  id: string
   name: string
   email: string
   active: boolean
   companyName: string
   lastAccess: string
   createdAt: string
   usedSeats: number | null
   contractedSeats: number | null
 }

 export type EmployeeAccessRow = {
-  id: number
+  id: string
   name: string
   lastName: string
   email: string
   active: boolean
   companyName: string
   wpUserId: number | null
   createdAt: string
   portalActive: boolean | null
   portalLastAccess: string
 }
```
`wpUserId` stays `number` — untouched.

- [ ] **Step 5: Edit `app/(portal)/superadmin/reports/actions.ts`**

```diff
 export async function retryCompanySyncAction(formData: FormData) {
   const session = await requireSuperAdminSession()
   const actor = getAuditActorFromSession(session)
-  const companyId = Number.parseInt(String(formData.get("empresa_id") ?? "0"), 10)
+  const companyId = String(formData.get("empresa_id") ?? "").trim()

   if (!companyId) {
     redirect("/superadmin/reports?error=sync_retry")
   }
```

- [ ] **Step 6: Edit `components/superadmin/ActivityFeed.tsx`**

```diff
 export type ActivityItem = {
-  id: number
+  id: string
   actor_name: string
   actor_role: string
   action: string
   entity_type: string
   summary: string
   created_at: Date
 }
```

- [ ] **Step 7: Edit `components/superadmin/RenewalsTable.tsx`**

```diff
 type Renewal = {
   company: {
-    id: number
+    id: string
     name: string
     packages: Array<{
       package: { name: string }
       expiration_date: Date | null
     }>
   }
   days: number
 }
```

- [ ] **Step 8: Edit `components/superadmin/OccupancyCard.tsx`**

```diff
 interface OccupancyCardProps {
   occupancyPct: number
-  companies: Array<{ id: number; name: string; used_seats: number; contracted_seats: number }>
+  companies: Array<{ id: string; name: string; used_seats: number; contracted_seats: number }>
 }
```

- [ ] **Step 9: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^(app/\(portal\)/superadmin/(consulting/actions\.ts|access/(actions|page)\.ts|reports/actions\.ts|page\.tsx)|components/superadmin/(ConsultingRequestActions|AccessTabs|ActivityFeed|RenewalsTable|OccupancyCard)\.tsx)"
```
Expected: no output — confirms `superadmin/access/page.tsx`'s 2 errors and `superadmin/page.tsx`'s 3 errors are gone without having touched either file.

- [ ] **Step 10: Commit**

```bash
git add "app/(portal)/superadmin/consulting/actions.ts" components/superadmin/ConsultingRequestActions.tsx "app/(portal)/superadmin/access/actions.ts" components/superadmin/AccessTabs.tsx "app/(portal)/superadmin/reports/actions.ts" components/superadmin/ActivityFeed.tsx components/superadmin/RenewalsTable.tsx components/superadmin/OccupancyCard.tsx
git commit -m "feat(uuid): convert superadmin consulting/access/reports actions and dashboard widget types to string IDs"
```

---

### Task 4: Company — Employees (`employees/actions.ts`, `DeleteEmployeeButton.tsx`)

**Files:**
- Modify: `app/(portal)/company/[slug]/employees/actions.ts`
- Modify: `components/company/DeleteEmployeeButton.tsx`

**Interfaces:**
- Consumed by `app/(portal)/company/[slug]/employees/page.tsx`, which passes `employee.id` (already `string`) into `DeleteEmployeeButton`'s `employeeId` prop — **`employees/page.tsx` needs no edit**, its 1 current error resolves automatically; verify in Step 3.

This is the largest single file in this plan (924 lines, 57 `tsc` errors), but every error cascades from 6 root-cause locations. `DeleteEmployeeButton.tsx` is not flagged today, breaks once this file converts.

- [ ] **Step 1: Edit `app/(portal)/company/[slug]/employees/actions.ts`**

```diff
 type CompanyProvisioningContext = {
-  id: number
+  id: string
   name: string
   contracted_seats: number
   packages: Array<{
     package: {
       delivery_mode: string
       courses: Array<{
         wp_course_id: number
         course_name: string
       }>
     }
   }>
 }

 type EmployeeProvisioningInput = {
-  companyId: number
+  companyId: string
   nombre: string
   apellido: string
   apellidoMaterno?: string | null
   email: string
   curp?: string | null
   departamento?: string | null
   puesto?: string | null
   ocupacionEspecificaClave?: string | null
   ocupacionEspecifica?: string | null
   password: string
   companyContext?: CompanyProvisioningContext
   actor: AuditActor
 }
```

```diff
-async function loadCompanyProvisioningContext(companyId: number) {
+async function loadCompanyProvisioningContext(companyId: string) {
```

```diff
 type CreatedCsvEmployee = NormalizedCsvEmployeeRow & {
-  id: number
+  id: string
 }
```

Five occurrences of the session-cast pattern, one per exported action (`createEmployeeAction`, `importEmployeesCsvAction`, `toggleEmployeeStatusAction`, `deleteEmployeeAction`, `triggerCompanyLearningSyncAction`) — same one-line change each:
```diff
-  const companyId = session.user.empresa_id as number
+  const companyId = session.user.empresa_id as string
```

Two occurrences of the `Number.parseInt` form-field pattern, one per exported action (`toggleEmployeeStatusAction`, `deleteEmployeeAction`) — same one-line change each:
```diff
-  const employeeId = Number.parseInt(String(formData.get("empleado_id") ?? "0"), 10)
+  const employeeId = getString(formData, "empleado_id")
```

No other line in this 924-line file needs a manual edit — every `Property 'packages'/'employees' does not exist`, every `EmployeeCreateManyInput`/`UserCreateManyInput` array-literal mismatch, and every plain `Argument of type 'number'` error resolves once these 6 root types/casts are `string`.

- [ ] **Step 2: Edit `components/company/DeleteEmployeeButton.tsx`**

```diff
 type DeleteEmployeeButtonProps = {
   action: (formData: FormData) => void | Promise<void>
-  employeeId: number
+  employeeId: string
   employeeName: string
   returnTo?: string
 }
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^(app/\(portal\)/company/\[slug\]/employees/(actions\.ts|page\.tsx)|components/company/DeleteEmployeeButton\.tsx)"
```
Expected: no output — confirms `employees/page.tsx`'s 1 error is gone without having touched it.

- [ ] **Step 4: Commit**

```bash
git add "app/(portal)/company/[slug]/employees/actions.ts" components/company/DeleteEmployeeButton.tsx
git commit -m "feat(uuid): convert company employees actions and DeleteEmployeeButton to string IDs"
```

---

### Task 5: Company — Assignments (`assignments/actions.ts`, `assignments/page.tsx`, `AssignmentBoard.tsx`)

**Files:**
- Modify: `app/(portal)/company/[slug]/assignments/actions.ts`
- Modify: `app/(portal)/company/[slug]/assignments/page.tsx`
- Modify: `app/(portal)/company/[slug]/assignments/AssignmentBoard.tsx`

**Interfaces:**
- `setCourseAssignmentsAction(courseId: number, employeeIds: string[])` — `courseId` (WordPress ID) stays `number`, only `employeeIds` changes. Produced here, consumed by `AssignmentBoard.tsx` in the same task.

All three files are tightly coupled (page builds data → passes to the client `AssignmentBoard` → which calls the server action on save), so they move together in one task rather than being split.

- [ ] **Step 1: Edit `app/(portal)/company/[slug]/assignments/actions.ts`**

```diff
-function parseEmployeeIds(values: number[]) {
-  return [...new Set(values.filter((id) => Number.isInteger(id) && id > 0))]
-}
+function parseEmployeeIds(values: string[]) {
+  return [...new Set(values.filter((id) => id.trim().length > 0))]
+}

 export async function setCourseAssignmentsAction(
   courseId: number,
-  employeeIds: number[]
+  employeeIds: string[]
 ): Promise<CourseAssignmentResult> {
   const session = await requireRhSession()
-  const companyId = session.user.empresa_id as number
+  const companyId = session.user.empresa_id as string
```

`courseId` stays `number` throughout the rest of the file — untouched (it's `wp_course_id`).

- [ ] **Step 2: Edit `app/(portal)/company/[slug]/assignments/page.tsx`**

```diff
 type AssignmentEmployee = {
-  id: number
+  id: string
   first_name: string
   last_name: string
   email: string
   department: string | null
   position: string | null
   courses: Array<{ wp_course_id: number }>
 }
```

```diff
-  const initialAssignments: Record<number, number[]> = {}
+  const initialAssignments: Record<number, string[]> = {}
```
(The `Record`'s key stays `number` — it's keyed by `wp_course_id`. Only the value array, which holds employee IDs, changes.)

- [ ] **Step 3: Edit `app/(portal)/company/[slug]/assignments/AssignmentBoard.tsx`**

```diff
 type EmployeeInfo = {
-  id: number
+  id: string
   name: string
   email: string
   department: string | null
   position: string | null
   initials: string
 }

 type AssignmentBoardProps = {
   courses: CourseInfo[]
   employees: EmployeeInfo[]
-  initialAssignments: Record<number, number[]>
+  initialAssignments: Record<number, string[]>
 }
```

```diff
-function cloneAssignments(source: Record<number, number[]>): Record<number, Set<number>> {
-  const result: Record<number, Set<number>> = {}
+function cloneAssignments(source: Record<number, string[]>): Record<number, Set<string>> {
+  const result: Record<number, Set<string>> = {}
   for (const [courseId, ids] of Object.entries(source)) {
     result[Number(courseId)] = new Set(ids)
   }
   return result
 }
```

```diff
-  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courses[0]?.wp_course_id ?? null)
+  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courses[0]?.wp_course_id ?? null)
```
(No change — `selectedCourseId` tracks `wp_course_id`, stays `number`. Shown for context only, do not edit this line.)

```diff
-  function toggleEmployee(employeeId: number) {
+  function toggleEmployee(employeeId: string) {
```

`workingSet`/`savedSet` (typed via `cloneAssignments`'s return type), `bulkSetVisible`'s `set.add(employee.id)`/`set.delete(employee.id)`, and `handleSave`'s `const employeeIds = [...workingSet]` need no further manual edits — they all infer correctly once `EmployeeInfo.id`, `cloneAssignments`'s signature, and `toggleEmployee`'s parameter are `string`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -F "app/(portal)/company/[slug]/assignments/"
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)/company/[slug]/assignments/actions.ts" "app/(portal)/company/[slug]/assignments/page.tsx" "app/(portal)/company/[slug]/assignments/AssignmentBoard.tsx"
git commit -m "feat(uuid): convert company assignments actions/page/board to string employee IDs"
```

---

### Task 6: Company — Consulting, Certificates, Progress, Layout

**Files:**
- Modify: `app/(portal)/company/[slug]/consulting/actions.ts`
- Modify: `components/company/consulting/CancelConsultingRequestButton.tsx`
- Modify: `app/(portal)/company/[slug]/certificates/page.tsx`
- Modify: `app/(portal)/company/[slug]/progress/page.tsx`
- Modify: `app/(portal)/company/[slug]/layout.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks in this plan.
- `CancelConsultingRequestButton.tsx`'s `requestId: string` — consumed by `app/(portal)/company/[slug]/consulting/page.tsx`, which passes `request.id` (already `string`) — **`consulting/page.tsx` needs no edit**, verify in Step 6.

`consulting/actions.ts` has 9 errors. `CancelConsultingRequestButton.tsx` is not flagged, breaks once `consulting/actions.ts` converts. `certificates/page.tsx` has 4 errors (one local duplicate of `lib/certificates.ts`'s `CompanyEmployee` type, already fixed in Plan 2 — this is a **separate, page-local copy** of the same type shape, not the same declaration). `progress/page.tsx` has 3. `layout.tsx` has 2 (both from the same line).

- [ ] **Step 1: Edit `app/(portal)/company/[slug]/consulting/actions.ts`**

```diff
   const companyId = session.user.empresa_id as number
+  const companyId = session.user.empresa_id as string
```
(Two occurrences, in `createConsultingRequestAction` and `cancelConsultingRequestAction` — same change both places.)

```diff
   const request = await prisma.consultingRequest.create({
     data: {
       company_id: companyId,
-      requested_by_user_id: Number.parseInt(session.user.id, 10),
+      requested_by_user_id: session.user.id,
       area: areaOption.id as ConsultingArea,
```
(`session.user.id` is already a `string` UUID — this `Number.parseInt` was already pointless before this migration and is now a real type error. Use the value directly.)

```diff
-  const requestId = Number.parseInt(getString(formData, "request_id"), 10)
+  const requestId = getString(formData, "request_id")
```

- [ ] **Step 2: Edit `components/company/consulting/CancelConsultingRequestButton.tsx`**

```diff
 type CancelConsultingRequestButtonProps = {
   action: (formData: FormData) => void | Promise<void>
-  requestId: number
+  requestId: string
   areaLabel: string
   returnTo?: string
 }
```

- [ ] **Step 3: Edit `app/(portal)/company/[slug]/certificates/page.tsx`**

```diff
 type CompanyEmployee = {
-  id: number
+  id: string
   first_name: string
   last_name: string
   email: string
   department: string | null
   certificates: PortalCertificateRecord[]
   courses: PortalCourseRecord[]
 }
```

- [ ] **Step 4: Edit `app/(portal)/company/[slug]/progress/page.tsx`**

```diff
-async function getWeeklyLearningActivity(companyId: number) {
+async function getWeeklyLearningActivity(companyId: string) {
```

No other line in this file changes — `company.id` (already `string`) is passed into this function at its one call site, and everything else in the file keys off `wp_course_id` (`courseMap: Map<number, ...>`), which stays `number`.

- [ ] **Step 5: Edit `app/(portal)/company/[slug]/layout.tsx`**

```diff
-  const branding = await getCompanyBranding(session.user.empresa_id as number)
+  const branding = await getCompanyBranding(session.user.empresa_id as string)
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -F -e "app/(portal)/company/[slug]/consulting/" -e "app/(portal)/company/[slug]/certificates/page.tsx" -e "app/(portal)/company/[slug]/progress/page.tsx" -e "app/(portal)/company/[slug]/layout.tsx" -e "components/company/consulting/CancelConsultingRequestButton.tsx"
```
Expected: no output — confirms `consulting/page.tsx`'s error is gone without having touched it.

- [ ] **Step 7: Commit**

```bash
git add "app/(portal)/company/[slug]/consulting/actions.ts" components/company/consulting/CancelConsultingRequestButton.tsx "app/(portal)/company/[slug]/certificates/page.tsx" "app/(portal)/company/[slug]/progress/page.tsx" "app/(portal)/company/[slug]/layout.tsx"
git commit -m "feat(uuid): convert company consulting/certificates/progress/layout to string IDs"
```

---

### Task 7: API routes (`certificates/[id]/dc3`, `certificates/zip`, `internal/notifications`, `internal/webhooks/tutor-learning`)

**Files:**
- Modify: `app/api/certificates/[id]/dc3/route.ts`
- Modify: `app/api/certificates/zip/route.ts`
- Modify: `app/api/internal/notifications/route.ts`
- Modify: `app/api/internal/webhooks/tutor-learning/route.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing consumed elsewhere in this plan — these are leaf routes.

**A note on `webhooks/tutor-learning/route.ts` specifically:** this task only fixes its TypeScript types (`employee_id`/`company_id` in the webhook payload). It does **not** fix the actual data — the WordPress plugin currently `absint()`s these values before sending them, which will still corrupt real UUIDs at runtime even after this type fix compiles cleanly. That is a separate, already-flagged, cross-repo issue (the plugin is `wordpress-plugin/desarrolla360-bridge/desarrolla360-bridge.php`, deployed independently of this codebase) — out of scope for this plan and not something this task should attempt to work around.

`certificates/[id]/dc3/route.ts` has 4 errors, `certificates/zip/route.ts` has 5, `internal/notifications/route.ts` has 3, `internal/webhooks/tutor-learning/route.ts` has 5.

- [ ] **Step 1: Edit `app/api/certificates/[id]/dc3/route.ts`**

```diff
   const { id } = await params
-  const constanciaId = Number(id)
-  if (!Number.isInteger(constanciaId) || constanciaId <= 0) {
+  const constanciaId = id
+  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(constanciaId)) {
     return NextResponse.json({ error: "ID de constancia invalido" }, { status: 400 })
   }
```

No other line changes — `constancia.employee.company_id === sessionEmpresaId` and `getOrCreateDc3PdfBytes({ certificateId: constanciaId })` both resolve once `constanciaId` itself is `string`.

- [ ] **Step 2: Edit `app/api/certificates/zip/route.ts`**

```diff
 type CompanyEmployee = {
-  id: number
+  id: string
   first_name: string
   last_name: string
   email: string
   department: string | null
   certificates: PortalCertificateRecord[]
   courses: PortalCourseRecord[]
 }
```

```diff
-  type ConstanciaRef = { id: number; folio: string }
+  type ConstanciaRef = { id: string; folio: string }
```

- [ ] **Step 3: Edit `app/api/internal/notifications/route.ts`**

```diff
 export async function GET() {
   const session = await getSession()
   if (!session) {
     return NextResponse.json({ error: "No autorizado" }, { status: 401 })
   }

-  const usuarioId = Number.parseInt(String(session.user.id), 10)
+  const usuarioId = session.user.id
```
```diff
 export async function PATCH() {
   const session = await getSession()
   if (!session) {
     return NextResponse.json({ error: "No autorizado" }, { status: 401 })
   }

-  const usuarioId = Number.parseInt(String(session.user.id), 10)
+  const usuarioId = session.user.id
   await markAllNotificationsRead(usuarioId)
```

- [ ] **Step 4: Edit `app/api/internal/webhooks/tutor-learning/route.ts`**

```diff
 type TutorLearningWebhookPayload = {
   event_type?: string
   occurred_at?: string
   student_wp_user_id?: number
-  employee_id?: number | null
-  company_id?: number | null
+  employee_id?: string | null
+  company_id?: string | null
   source_hash?: string | null
   courses?: EmployeeLearningBridgeSnapshot["courses"]
   certificates?: EmployeeLearningBridgeSnapshot["certificates"]
 }
```

`student_wp_user_id` stays `number` — untouched. No other line in this file needs editing — `payload.employee_id`/`payload.company_id` flow into `syncEmployeeLearningFromBridgeSnapshot`, `recordTutorLearningWebhookEvent`, `getCompanyBranding`, and `companyCacheRootTag`, all of which already expect `string`/`string | null` per Plan 2.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -F -e "app/api/certificates/[id]/dc3/route.ts" -e "app/api/certificates/zip/route.ts" -e "app/api/internal/notifications/route.ts" -e "app/api/internal/webhooks/tutor-learning/route.ts"
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add "app/api/certificates/[id]/dc3/route.ts" app/api/certificates/zip/route.ts app/api/internal/notifications/route.ts app/api/internal/webhooks/tutor-learning/route.ts
git commit -m "feat(uuid): convert certificate/notification/webhook API routes to string IDs"
```

---

---

### Task 8: `app/api/upload/company-logo/route.ts` (discovered mid-execution — a class of bug `tsc` cannot catch)

**Discovered during Task 1's dispatch, not in the original research pass:** while fixing `components/superadmin/CompanyBrandingForm.tsx` (itself an addition Task 1 had to make beyond its original file list — see that task's report), the implementer found `app/api/upload/company-logo/route.ts` reads `companyId` out of raw `FormData` with `Number(formData.get("companyId"))` and validates it with `Number.isInteger(companyId) || companyId <= 0`. Once `CompanyBrandingForm.tsx` sends a real UUID as the `companyId` field (which it always did — the upload call site was never wrong, only this route's parsing of it), `Number("8b506748-...")` is `NaN`, the validity check fails, and every company logo upload returns a 400 "ID de empresa inválido" — a silent, total feature break with zero `tsc` signal, because `FormData` values are untyped strings all the way through; there is no Prisma-typed boundary for the compiler to catch a mismatch against.

**This is a distinct risk category from everything else in this plan**, worth flagging explicitly for whoever picks up Plan 4 or does the manual smoke test: any code that parses an ID out of `FormData`/`URLSearchParams`/a raw request body with `Number(...)` is invisible to `tsc` no matter how thorough the type conversion elsewhere is. A repo-wide grep for this exact pattern (`Number(formData.get(...))` / `Number.parseInt(...formData.get...)` / the equivalent for `searchParams`) was run after this was found, across the entire `app/` tree — confirmed this is the **only** occurrence outside what this plan's other 7 tasks already cover (the other matches are either already-planned portal-ID fixes or genuinely WordPress-domain `wp_course_id`/`wpCourseId` fields that correctly stay `number`, e.g. `app/(portal)/superadmin/dc3/actions.ts` and `app/api/upload/instructor-signature/route.ts` — neither needs any change).

**Files:**
- Modify: `app/api/upload/company-logo/route.ts`

**Interfaces:**
- Consumes: nothing from this plan's other tasks (the FormData contract with `CompanyBrandingForm.tsx`, fixed in Task 1, was always correct on the sending side — only this route's parsing was wrong).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Edit `app/api/upload/company-logo/route.ts`**

```diff
   const formData = await request.formData()
   const file = formData.get("file") as File | null
-  const companyId = Number(formData.get("companyId"))
+  const companyId = String(formData.get("companyId") ?? "").trim()

   if (!file || file.size === 0) {
     return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
   }

-  if (!Number.isInteger(companyId) || companyId <= 0) {
+  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
     return NextResponse.json({ error: "ID de empresa inválido" }, { status: 400 })
   }
```

No other line needs editing — `` `logos/${companyId}/${Date.now()}.png` `` already just interpolates the value into a string, works identically whether `companyId` is a number or a string.

- [ ] **Step 2: Verify**

```bash
npm run lint 2>&1 | tail -5
```
Expected: 0 errors, 1 pre-existing unrelated warning (this file was never `tsc`-flagged, so there's no scoped grep to run — `npx tsc --noEmit` on the whole repo should simply show no *new* errors introduced, which lint alone won't catch; also run a quick sanity read of the diff to confirm no stray syntax issue).

```bash
npx tsc --noEmit 2>&1 | grep "^app/api/upload/company-logo/route.ts"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/company-logo/route.ts
git commit -m "fix(uuid): parse company-logo upload's companyId as UUID string, not integer"
```

---

---

### Task 9: `components/company/Dc3EditorList.tsx` (a genuine plan-authoring miss, found during Task 7)

**Discovered during Task 7's dispatch — this one is a mistake in this plan's own research, not a new class of bug:** `app/(portal)/superadmin/dc3/page.tsx` was in this plan's original 25-file `tsc` error list (1 error) from the very start. When this plan's author read the file in full during authoring, the conclusion reached was "no changes needed" because the visible code only builds `courses` from `wp_course_id`-keyed data — but the actual error is at the `metadata` field, not anything wp-course-related, and was missed on that read. `components/company/Dc3EditorList.tsx`'s exported `CourseEntry` type has a nested `CourseMetadata.id: number` field — this is `CourseDc3Metadata.id`, a portal-native UUID primary key (Plan 1), not `wp_course_id` (which correctly stays `number` in the same type, one field over). The two look similar at a glance in a type block, which is exactly how this got missed.

**Files:**
- Modify: `components/company/Dc3EditorList.tsx`

**Interfaces:**
- Consumes: nothing from this plan's other tasks.
- Produces: `CourseEntry.metadata: CourseMetadata | null` with `CourseMetadata.id: string` — consumed by `app/(portal)/superadmin/dc3/page.tsx`, which needs **no edit of its own** — it builds `metadata: metadataMap.get(course.wp_course_id) ?? null` from Prisma-inferred data (already `string`), so its 1 current error resolves automatically once this task lands.

`Dc3EditorList.tsx` is not `tsc`-flagged itself today (the mismatch surfaces at the consuming page's assignment, not inside this file, since nothing here explicitly annotates a variable against `CourseEntry` internally). `metadata.id` is never actually read anywhere in this ~800-line component beyond being part of the type shape — confirmed by grep — so this is a type-only fix with no behavioral change.

- [ ] **Step 1: Edit `components/company/Dc3EditorList.tsx`**

```diff
 type CourseMetadata = {
-  id: number
+  id: string
   course_name: string | null
   duration_hours: number | null
   subject_area_name: string | null
   subject_area_code: string | null
   training_agent_name: string | null
   training_agent_registration: string | null
   instructor_name: string | null
   instructor_signature_url: string | null
   source: string
   last_synced_at: Date | null
 }
```

`CourseEntry.wpCourseId: number` (the sibling field, one level up) stays untouched — it's WordPress's own ID.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -F -e "components/company/Dc3EditorList.tsx" -e "app/(portal)/superadmin/dc3/page.tsx"
```
Expected: no output — confirms both this file and `dc3/page.tsx`'s pre-existing error are clean.

- [ ] **Step 3: Commit**

```bash
git add components/company/Dc3EditorList.tsx
git commit -m "fix(uuid): convert Dc3EditorList's CourseMetadata.id to string, resolving superadmin dc3 page's original tsc error"
```

---

## Self-Review Notes (completed during authoring, not a step for the executor)

- **Spec coverage:** §3 (wp_* untouched) → every task's diffs explicitly leave `wp_course_id`/`wp_user_id`/`wp_bundle_id`/`courseId`/`wpUserId` as `number`, confirmed per file during research (not assumed from naming alone — several files were read in full specifically to trace which numeric-looking field was WordPress-domain vs portal-domain). §7 (route params, form fields) → the two named bug patterns (`Number(id)` + `Number.isInteger` guard; `Number.parseInt(formData.get(...))`) are called out once in Global Constraints and then applied identically everywhere they occur, rather than re-derived per task.
- **Placeholder scan:** none — every task has literal diffs; the two "no change needed, shown for context" call-outs (Task 5's `selectedCourseId` line, Task 1's `getPositiveInt`) explicitly say so rather than leaving it ambiguous whether they were forgotten.
- **Type consistency:** traced every "this file isn't tsc-flagged today but will break" pairing explicitly in each task's Interfaces block, and confirmed via direct `grep`/read that the pairing is real (client component genuinely imports the action being converted, or a page genuinely constructs the object literal the component's prop type describes) — 12 such files found across this plan (`SuspendCompanyButton.tsx`, `CompanyRow.tsx` auto-resolve, `PackageForm.tsx`, `DeletePackageButton.tsx`, `PackageRow.tsx` auto-resolves, `ConsultingRequestActions.tsx`, `AccessTabs.tsx`, `access/page.tsx` auto-resolves, `ActivityFeed.tsx`/`RenewalsTable.tsx`/`OccupancyCard.tsx`, `superadmin/page.tsx` auto-resolves, `DeleteEmployeeButton.tsx`, `employees/page.tsx` auto-resolves, `AssignmentBoard.tsx`, `CancelConsultingRequestButton.tsx`, `consulting/page.tsx` auto-resolves). This was the single biggest lesson carried forward from Plan 2's mid-execution discoveries — this plan's authoring went looking for the pattern proactively (`grep -rl '"use client"' ... | grep actions`) instead of waiting for each one to surface as a scoped-count mismatch during execution.
- **Scope check:** 9 tasks, 40 files total (25 from the original `tsc` error list + 13 found via call-graph tracing + 2 mid-execution corrections). Grouped by feature area/directory as the spec's §10 suggested, sized so no single task exceeds what Plan 2's largest tasks handled (Task 4 here, at 2 files/59 errors, is comparable to Plan 2's Task 6). Task 8 was added mid-execution once Task 1's dispatch surfaced `app/api/upload/company-logo/route.ts` — a bug class (raw `FormData`/`URLSearchParams` values parsed with `Number(...)`) that has zero `tsc` signature, so it could not have been found by this plan's original error-list-driven or call-graph-driven research passes; it was only caught by a human/agent noticing the pattern while fixing something adjacent, then a repo-wide grep confirming it was the only instance. Task 9 was added once Task 7's dispatch surfaced `components/company/Dc3EditorList.tsx` — this one is a genuine authoring mistake, not a new bug class: `app/(portal)/superadmin/dc3/page.tsx` was in the original 25-file error list from the start, but this plan's author read the file, concluded (wrongly) that no change was needed, and missed the nested `CourseMetadata.id` field one level down in a sibling component's type. Both corrections are recorded here rather than silently smoothed over. Does not touch `prisma/seed.ts` or `load-testing/`, which remain Plan 4.
- **Known residual, not this plan's job to fix:** Task 7's `webhooks/tutor-learning/route.ts` note about the WordPress plugin's `absint()` corruption is repeated from Plan 2's final review — this plan's type fix is necessary but not sufficient for that route to work correctly against real WordPress traffic. Confirmed non-blocking for this plan (a type-only concern) and already flagged to the user separately.
