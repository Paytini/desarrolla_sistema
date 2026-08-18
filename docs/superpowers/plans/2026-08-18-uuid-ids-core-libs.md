# UUID Primary Keys — Plan 2: Core Libraries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update every shared `lib/` module (plus `auth.ts`'s one downstream error) so all portal-entity ID parameters and Prisma query shapes match the UUID schema Plan 1 already applied to the database — closing all `lib/`-rooted `tsc` errors and the handful of type-safe-but-semantically-wrong signatures `tsc` doesn't catch.

**Architecture:** No new abstractions — this is a mechanical `number` → `string` type migration across function signatures, Prisma `where`/`data`/`select` shapes, and a few standalone type aliases, file by file, in dependency order. The one genuine design change is `Certificate.reference_number`'s folio format: it now derives from the new `folio_sequence` column (fetched via `nextval()` before the insert) instead of `employeeId`, per the spec. `wp_*`-named fields (WordPress/Tutor LMS's own numeric IDs — `wp_user_id`, `wp_course_id`, `wp_bundle_id`) are never touched; this plan's entire job is telling portal-native IDs apart from WordPress IDs at every call site and converting only the former.

**Tech Stack:** TypeScript, Prisma 7 (generated client already reflects the UUID schema from Plan 1), Next.js 16.

**Spec:** `docs/superpowers/specs/2026-08-18-random-uuid-ids-design.md`
**Prior plan:** `docs/superpowers/plans/2026-08-18-uuid-ids-schema-migration.md` (Plan 1 — schema + migration + Prisma Client, already merged into this branch's history)

## Global Constraints

- Every portal-entity ID (`companyId`, `employeeId`, `userId`/`usuarioId`, `certificateId`, `sessionId`, `jobId`, `notificationId`, `entityId`/`entidadId`, `actorUserId`) changes from `number` to `string` wherever it names a value that ultimately flows into one of the 16 UUID-keyed columns from Plan 1.
- Every `wp_*`-named field or parameter (`wp_user_id`, `wp_course_id`, `wp_bundle_id`, and the many WordPress-domain `userId`/`courseId` parameters inside `lib/wordpress-bridge.ts`'s enrollment functions and all of `lib/tutorlms-api.ts`) stays `number` — these are WordPress/Tutor LMS's own IDs, untouched by Plan 1's migration (spec §3). Getting this distinction wrong in either direction is the main risk in this plan; every task below states explicitly, per file, which is which.
- `tsc` under-reports: several files compile cleanly today despite having `number`-typed ID parameters, because the value flows through a loosely-typed (`Record<string, unknown>` or template-literal) boundary before hitting a strictly-typed Prisma call. `lib/tenant-context.ts`, `lib/cache-tags.ts`, and `lib/learning-types.ts` are three confirmed cases (verified by direct inspection, not by trusting a clean `tsc` run) — each task below says explicitly whether its files were tsc-flagged or found by manual sweep, and manual-sweep files still need the same fix even though `tsc --noEmit` won't confirm them today.
- `Certificate.folio_sequence` (added in Plan 1) is fetched via `SELECT nextval('certificates_folio_sequence_seq')` *before* the `certificate.create()` call that needs it, so the same value can be used both as the column's explicit value and inside the built `reference_number` string in one create — no placeholder value, no follow-up update.
- No test suite exists in this repo. Verification per task is `npx tsc --noEmit` (grep the task's own files out of the remaining error list to confirm they're clean, and confirm the total count decreased by exactly the expected amount — never more, never less, since an unexpected extra drop can mean a change silently loosened a type rather than correctly narrowing it) plus `npm run lint`.
- This plan's own scope ends when every file listed across its 8 tasks is `tsc`-clean. It does **not** touch anything under `app/`, `components/`, or `prisma/seed.ts` — those are Plan 3 and Plan 4. Expect the overall repo-wide `tsc --noEmit` count to still be large (~240+ errors) after this plan lands; that remainder is exactly Plan 3's scope.

---

### Task 1: Foundational type infrastructure — `lib/tenant-context.ts`, `lib/cache-tags.ts`, `lib/learning-types.ts`

**Files:**
- Modify: `lib/tenant-context.ts`
- Modify: `lib/cache-tags.ts`
- Modify: `lib/learning-types.ts`

**Interfaces:**
- Produces: `getActiveCompanyId(): string | null`, `enterCompanyContext(companyId: string): void` — consumed by `lib/prisma.ts`'s tenant-guard extension (no code change needed there — verify, don't edit, per Step 3 below). `companyCacheRootTag(companyId: string)`, `companyEmployeesTag(companyId: string)`, `companyAssignmentsTag(companyId: string)`, `getCompanyDashboardTags(companyId: string)` — consumed by Task 7 (`dashboard-cache.ts`) and by Plan 3's route/action files. `PortalCourseRecord`/`PortalCertificateRecord`/`PortalPackageCourseRecord` with `id`/`employee_id`/`package_id` as `string` (optional variants stay optional) and `wp_course_id` unchanged as `number` — consumed by Task 6 (`certificates.ts`) and by Plan 3's UI components.

None of these three files appear in `npx tsc --noEmit`'s current output — confirmed by direct grep before writing this plan. They still need this change: their `number`-typed IDs flow into template literals (`cache-tags.ts`) or an `AsyncLocalStorage<number>` that's only ever read into an untyped object spread (`tenant-context.ts` → `lib/prisma.ts`), so a real type mismatch would never surface as a compile error even though passing a UUID string into a variable declared `number` is wrong. `learning-types.ts` is a set of standalone type aliases nothing currently assigns a raw Prisma row into directly, so nothing trips today — but Task 6 does exactly that assignment.

- [ ] **Step 1: Edit `lib/tenant-context.ts`**

```diff
-const companyContext = new AsyncLocalStorage<number>()
+const companyContext = new AsyncLocalStorage<string>()

-export function enterCompanyContext(companyId: number): void {
+export function enterCompanyContext(companyId: string): void {
   companyContext.enterWith(companyId)
 }

-export function getActiveCompanyId(): number | null {
+export function getActiveCompanyId(): string | null {
   return companyContext.getStore() ?? null
 }
```

- [ ] **Step 2: Edit `lib/cache-tags.ts`**

```diff
-export function companyCacheRootTag(companyId: number) {
+export function companyCacheRootTag(companyId: string) {
   return `${COMPANY_CACHE_PREFIX}:${companyId}`
 }

-export function companyEmployeesTag(companyId: number) {
+export function companyEmployeesTag(companyId: string) {
   return `${companyCacheRootTag(companyId)}:empleados`
 }

-export function companyAssignmentsTag(companyId: number) {
+export function companyAssignmentsTag(companyId: string) {
   return `${companyCacheRootTag(companyId)}:asignaciones`
 }

-export function getCompanyDashboardTags(companyId: number) {
+export function getCompanyDashboardTags(companyId: string) {
   return [
     companyCacheRootTag(companyId),
     companyEmployeesTag(companyId),
     companyAssignmentsTag(companyId),
   ] as const
 }
```

- [ ] **Step 3: Edit `lib/learning-types.ts`**

```diff
 export type PortalCourseRecord = {
-  id: number
-  employee_id: number
+  id: string
+  employee_id: string
   wp_course_id: number
   course_name: string
   progress_pct: number
   completed: boolean
   access_status: string
   access_source: string | null
   access_error: string | null
   last_access_attempt: Date | null
   course_start_date: Date | null
   completed_at: Date | null
   last_synced_at: Date
 }

 export type PortalCertificateRecord = {
-  id: number
-  employee_id: number
+  id: string
+  employee_id: string
   wp_course_id: number
   course_name: string
   reference_number: string
   certificate_url: string | null
   issued_at: Date
 }

 export type PortalPackageCourseRecord = {
-  id?: number
-  package_id?: number
+  id?: string
+  package_id?: string
   wp_course_id: number
   course_name: string
   cover_url?: string | null
 }
```

- [ ] **Step 4: Verify `lib/prisma.ts` needs no edit (read-only check, do not modify)**

Read `lib/prisma.ts`. Confirm `getActiveCompanyId()`'s return value only ever flows into `scoped: Record<string, unknown>` object spreads (`scoped.where = { ...where, company_id: companyId }` and similar for `data`/`create`) — never into a variable or parameter with an explicit `number` type annotation. If that's still true after Step 1's change, no edit is needed here; the file was already structurally ready for a `string` company ID, it just wasn't statically checking it. If you find a spot that DOES have an explicit `number` annotation on the company ID, stop and report — that's a deviation from what this task's research found and needs a ruling before proceeding.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^lib/(tenant-context|cache-tags|learning-types)\.ts"
```
Expected: no output (these files had zero errors before and after — this step exists to confirm the edit didn't introduce a NEW error, not to watch a count go down).

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `328` (unchanged from Plan 1's baseline — these three files' fixes don't reduce today's error count by themselves, since nothing currently flags them; later tasks that consume `getActiveCompanyId()`/`cache-tags`/`learning-types` are what actually goes green).

```bash
npm run lint 2>&1 | tail -5
```
Expected: same as Plan 1's baseline (0 errors, 1 pre-existing unrelated warning in `app/(portal)/error.tsx`).

- [ ] **Step 6: Commit**

```bash
git add lib/tenant-context.ts lib/cache-tags.ts lib/learning-types.ts
git commit -m "feat(uuid): convert tenant-context, cache-tags, and learning-types to string IDs"
```

---

### Task 2: `lib/auditing.ts` + `lib/access-control.ts`

**Files:**
- Modify: `lib/auditing.ts`
- Modify: `lib/access-control.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (these two files don't import `tenant-context`/`cache-tags`/`learning-types`).
- Produces: `AuditActor.userId: string | null`, `getCompanySeatSnapshot(companyId: string)`, `createAuditEvent(input: { entityId?: string | null; companyId?: string | null; ... })`, `createSeatHistoryEntry(input: { companyId: string; ... })` — consumed by Task 6 and by Plan 3's action files. `deleteEmployeeRecord(options: { employeeId: string; companyId?: string; ... })`, `togglePortalUserStatus(userId: string, ...)`, `revokeUserPortalSessions(userId: string)`, `revokePortalSession(sessionId: string)` — consumed by Plan 3.

`lib/auditing.ts` has 7 `tsc` errors today, `lib/access-control.ts` has 11 — both tsc-flagged.

- [ ] **Step 1: Edit `lib/auditing.ts`**

```diff
 export type AuditActor = {
-  userId: number | null
+  userId: string | null
   nombre: string
   email: string | null
   rol: string
 }

 function parseSessionUserId(value: string | undefined | null) {
   if (!value) return null

-  const parsed = Number.parseInt(value, 10)
-  return Number.isInteger(parsed) ? parsed : null
+  return value
 }
```

```diff
-export async function getCompanySeatSnapshot(companyId: number) {
+export async function getCompanySeatSnapshot(companyId: string) {
```

```diff
 export async function createAuditEvent(input: {
   actor: AuditActor
   accion: string
   entityType: string
-  entityId?: number | null
-  companyId?: number | null
+  entityId?: string | null
+  companyId?: string | null
   resumen: string
   metadata?: InputJsonValue
 }) {
```

```diff
 export async function createSeatHistoryEntry(input: {
   actor: AuditActor
-  companyId: number
+  companyId: string
   motivo: string
   detalle?: string | null
   before: CompanySeatSnapshot
   after: CompanySeatSnapshot
 }) {
```

`parseSessionUserId` keeps its `string | undefined | null` input type unchanged (it already receives `session.user.id`, which is already a string per NextAuth's session shape in this codebase — `auth.ts` does `id: String(usuario.id)` today, unaffected by this plan). It now returns the string as-is instead of parsing it to an int.

- [ ] **Step 2: Edit `lib/access-control.ts`**

```diff
 type DeleteEmployeeOptions = {
-  employeeId: number
-  companyId?: number
+  employeeId: string
+  companyId?: string
   actor?: AuditActor
   source?: "RH" | "SUPERADMIN" | "SYSTEM"
 }
```

```diff
-export async function togglePortalUserStatus(
-  userId: number,
+export async function togglePortalUserStatus(
+  userId: string,
   callerRole: "SUPERADMIN" | "RH" | "SYSTEM" = "SYSTEM"
 ) {
```

```diff
-export async function revokeUserPortalSessions(userId: number) {
+export async function revokeUserPortalSessions(userId: string) {
   return prisma.portalSession.deleteMany({
     where: { user_id: userId },
   })
 }

-export async function revokePortalSession(sessionId: number) {
+export async function revokePortalSession(sessionId: string) {
   return prisma.portalSession.deleteMany({
     where: { id: sessionId },
   })
 }
```

No other lines in `access-control.ts` need editing — every other `number`-typed-looking usage (`employee.id`, `employee.company_id`, etc.) is inferred from Prisma's generated types, which Plan 1 already made `string`; only the two explicit parameter type annotations above and the type alias needed a manual edit.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^lib/(auditing|access-control)\.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `310` (328 − 7 auditing − 11 access-control = 310).

- [ ] **Step 4: Commit**

```bash
git add lib/auditing.ts lib/access-control.ts
git commit -m "feat(uuid): convert auditing and access-control to string IDs"
```

---

### Task 3: `lib/notifications.ts`

**Files:**
- Modify: `lib/notifications.ts`

**Interfaces:**
- Produces: `notifySuperadmins(content: NotifyContent & { excludeUsuarioId?: string | null })`, `notifyCompanyRH(companyId: string, ...)`, `notifyEmployeeNewCertificates(employeeId: string, ...)`, `getRecentNotifications(userId: string, ...)`, `getUnreadNotificationCount(userId: string)`, `markAllNotificationsRead(userId: string)` — `notifyEmployeeNewCertificates` is consumed by Task 5 (`employee-learning.ts`), so this task must land before Task 5.

12 `tsc` errors today, all tsc-flagged.

- [ ] **Step 1: Edit `lib/notifications.ts`**

```diff
 type NotifyContent = {
   tipo: string
   titulo: string
   mensaje: string
   entidadTipo?: string
-  entidadId?: number
+  entidadId?: string
 }

-async function createNotifications(usuarioIds: number[], content: NotifyContent) {
+async function createNotifications(usuarioIds: string[], content: NotifyContent) {
```

```diff
 export async function notifySuperadmins(
-  content: NotifyContent & { excludeUsuarioId?: number | null }
+  content: NotifyContent & { excludeUsuarioId?: string | null }
 ) {
```

```diff
-export async function notifyCompanyRH(companyId: number, content: NotifyContent) {
+export async function notifyCompanyRH(companyId: string, content: NotifyContent) {
```

```diff
 export async function notifyEmployeeNewCertificates(
-  employeeId: number,
+  employeeId: string,
   certificates: { courseName: string; certificateUrl: string }[]
 ) {
```

```diff
-export async function getRecentNotifications(userId: number, limit = 20) {
+export async function getRecentNotifications(userId: string, limit = 20) {
   return prisma.notification.findMany({
     where: { user_id: userId },
     orderBy: { created_at: "desc" },
     take: limit,
   })
 }

-export async function getUnreadNotificationCount(userId: number) {
+export async function getUnreadNotificationCount(userId: string) {
   return prisma.notification.count({
     where: { user_id: userId, read: false },
   })
 }

-export async function markAllNotificationsRead(userId: number) {
+export async function markAllNotificationsRead(userId: string) {
   await prisma.notification.updateMany({
     where: { user_id: userId, read: false },
     data: { read: true },
   })
 }
```

`checkAndNotifyExpiringPackages`'s `entidadId: ep.id` calls (where `ep` is a `CompanyPackage` row) need no edit — `ep.id` is already inferred as `string` from Prisma's generated type; only `NotifyContent.entidadId`'s declared type needed to widen to match.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "^lib/notifications.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `298` (310 − 12 = 298).

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat(uuid): convert notifications to string IDs"
```

---

### Task 4: `lib/course-sync.ts` + `lib/jobs.ts`

**Files:**
- Modify: `lib/course-sync.ts`
- Modify: `lib/jobs.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1-3.
- Produces: `PackageEnrollmentSyncPayload` (in `jobs.ts`) with `companyId: string`, `employeeIds: string[]`, `processedEmployeeIds: string[]` — this is the shape stored in `Job.payload` (untyped `Json` column; the type only exists in application code, so this change is purely about what values get written/read, not a schema change). `syncSingleEmployeePackageEnrollment(employee: { id: string; wp_user_id: number | null }, ...)`, `PackageEnrollmentSyncResult.employeeId: string`, `enqueuePackageEnrollmentSyncJob(companyId: string)`, `setCourseAssignment(companyId: string, courseId: number, ..., employeeIds: string[], ...)`, `markEmployeeCourseAccessError(employeeId: string, courseIds: number[], ...)`, `upsertEmployeePackageCourses(employeeId: string, ...)`, `replaceEmployeePackageCourses(employeeId: string, ...)` — consumed by Task 5 and by Plan 3's action files. `processPendingJobs`'s internal `job.id`/`candidate.id` (already `string` from Prisma) and `processPackageEnrollmentSyncJob(jobId: string, ...)`.

**wp_course_id / courseId / wpUserId stay `number` throughout both files** — every occurrence in `course-sync.ts` and `jobs.ts` of a parameter literally named `courseId`, `wpUserId`, or `wp_course_id` refers to Tutor LMS's own numeric ID and must NOT change. Only `employeeId`, `companyId`, `employeeIds`, and the `PackageEnrollmentSyncResult`/`PackageEnrollmentSyncPayload` employee/company fields change.

`course-sync.ts` has 17 `tsc` errors, `jobs.ts` has 9, both tsc-flagged.

- [ ] **Step 1: Edit `lib/course-sync.ts`**

```diff
 function buildPackageCourseUpsertOperation(
-  employeeId: number,
+  employeeId: string,
   packageCourse: PackageCourseInput,
   syncedAt: Date
 ) {
```

```diff
 export async function upsertEmployeePackageCourses(
-  employeeId: number,
+  employeeId: string,
   packageCourses: PackageCourseInput[]
 ) {
```

```diff
 export async function replaceEmployeePackageCourses(
-  employeeId: number,
+  employeeId: string,
   packageCourses: PackageCourseInput[]
 ) {
```

```diff
 export async function setCourseAssignment(
-  companyId: number,
+  companyId: string,
   courseId: number,
   courseName: string,
-  employeeIds: number[],
+  employeeIds: string[],
   accessSource?: string | null
 ) {
```

```diff
-  const bridgeErrors: Array<{ employeeId: number; message: string }> = []
+  const bridgeErrors: Array<{ employeeId: string; message: string }> = []
```

```diff
 export type PackageEnrollmentSyncResult = {
-  employeeId: number
+  employeeId: string
   wpUserId: number
   enrolledCount: number
   seededOnly?: boolean
   error?: string
 }

 export async function syncSingleEmployeePackageEnrollment(
-  employee: { id: number; wp_user_id: number | null },
+  employee: { id: string; wp_user_id: number | null },
   packageCourses: PackageCourseInput[],
   courseIds: number[],
   courseIdSet: Set<number>,
   deliveryMode: string
 ): Promise<PackageEnrollmentSyncResult> {
```

```diff
-export async function enqueuePackageEnrollmentSyncJob(companyId: number) {
+export async function enqueuePackageEnrollmentSyncJob(companyId: string) {
```

```diff
 export async function markEmployeeCourseAccessError(
-  employeeId: number,
+  employeeId: string,
   courseIds: number[],
   accessOrigin: string | null | undefined,
   message: string
 ) {
```

- [ ] **Step 2: Edit `lib/jobs.ts`**

```diff
 type PackageEnrollmentSyncPayload = {
-  companyId: number
-  employeeIds: number[]
-  processedEmployeeIds: number[]
+  companyId: string
+  employeeIds: string[]
+  processedEmployeeIds: string[]
 }

-async function processPackageEnrollmentSyncJob(jobId: number, payload: PackageEnrollmentSyncPayload) {
+async function processPackageEnrollmentSyncJob(jobId: string, payload: PackageEnrollmentSyncPayload) {
```

The rest of `processPackageEnrollmentSyncJob`'s body (`company.packages[0]`, `activePackage.package.courses`, `employees` select) needs no further edits beyond what the payload/param type changes above already fix — `company`/`employees`/`activePackage` are all Prisma-inferred and already `string`-keyed after Plan 1.

```diff
-export async function processPendingJobs(limit: number = JOBS_PER_CRON_TICK) {
+export async function processPendingJobs(limit: number = JOBS_PER_CRON_TICK) {
```
(No change to this line — `limit` is a plain count, not an ID. Included here only to show it's intentionally untouched; do not edit it.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^lib/(course-sync|jobs)\.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `272` (298 − 17 − 9 = 272).

- [ ] **Step 4: Commit**

```bash
git add lib/course-sync.ts lib/jobs.ts
git commit -m "feat(uuid): convert course-sync and jobs to string employee/company IDs"
```

---

### Task 5: `lib/employee-learning.ts` (+ folio_sequence redesign)

**Files:**
- Modify: `lib/employee-learning.ts`

**Interfaces:**
- Consumes: `notifyEmployeeNewCertificates(employeeId: string, ...)` from Task 3.
- Produces: `syncEmployeeLearningFromBridgeSnapshot`, `syncEmployeeLearningByEmail`, `syncCompanyEmployeeLearningBatch`, `scheduleCompanyEmployeeLearningBatch`, `getEmployeeLearningData` — all now taking/returning `string` employee/company IDs where they did `number` before. Consumed by Plan 3's routes/actions (webhook handler, sync endpoints, page-level calls).

**wp_course_id / wpUserId stay `number`** throughout — `hasWpCourseId`'s generic constraint, `deriveCertificatesFromCourses`, `mergeBridgeCertificates`'s `Map<number, ...>`, and every `wp_user_id`/`wpUserId` reference are untouched.

17 `tsc` errors today, all tsc-flagged.

- [ ] **Step 1: Convert the in-flight tracking sets and all `employeeId`/`companyId` parameter types**

```diff
-const backgroundSyncsInFlight = new Set<number>()
+const backgroundSyncsInFlight = new Set<string>()
 const backgroundBatchSyncsInFlight = new Set<string>()
```

```diff
 async function upsertEmployeeCoursesFromBridge(
-  employeeId: number,
+  employeeId: string,
   courses: BridgeStudentCourse[]
 ) {
```

```diff
 async function upsertEmployeeCertificatesFromBridge(
-  employeeId: number,
+  employeeId: string,
   certificates: BridgeStudentCertificate[]
 ) {
```

```diff
 async function resolveEmployeeIdForLearningSync(input: {
-  employeeId?: number | null
+  employeeId?: string | null
   wpUserId?: number | null
 }) {
```

```diff
 export async function syncEmployeeLearningFromBridgeSnapshot(input: {
-  employeeId?: number | null
+  employeeId?: string | null
   wpUserId?: number | null
   snapshot: EmployeeLearningBridgeSnapshot
 }) {
```

```diff
-async function fetchEmployeeLearningRecordById(employeeId: number) {
+async function fetchEmployeeLearningRecordById(employeeId: string) {
```

```diff
-async function syncEmployeeLearningRecord(employeeId: number) {
+async function syncEmployeeLearningRecord(employeeId: string) {
```

```diff
-function scheduleEmployeeLearningSync(employeeId: number) {
+function scheduleEmployeeLearningSync(employeeId: string) {
```

```diff
 export async function syncCompanyEmployeeLearningBatch(
-  companyId: number,
+  companyId: string,
   options?: {
     limit?: number
     staleOnly?: boolean
   }
 ) {
```

```diff
 async function syncEmployeeLearningBatchInternal(options?: {
-  companyId?: number
+  companyId?: string
   limit?: number
   staleOnly?: boolean
 }) {
```

```diff
   const results: Array<{
-    employeeId: number
+    employeeId: string
     status: "synced" | "failed"
     message?: string
   }> = []
```

```diff
 export function scheduleCompanyEmployeeLearningBatch(
-  companyId: number,
+  companyId: string,
   options?: {
     limit?: number
     staleOnly?: boolean
   }
 ) {
-  if (!companyId) {
+  if (!companyId) {
     return false
   }
```
(The `if (!companyId)` guard needs no logic change — an empty string is falsy same as `0`, so the existing check still correctly rejects a missing ID. Shown here only for context, not to be edited.)

- [ ] **Step 2: Redesign the folio to use `folio_sequence` instead of `employeeId`**

`buildCertificateFolio`'s own signature does **not** change type — its first parameter was already `number` and `folio_sequence` is also `number`; only the *meaning* of what gets passed changes (a semantic rename, not a type change):

```diff
-function buildCertificateFolio(employeeId: number, courseId: number, completedAt?: string | null) {
+function buildCertificateFolio(folioSequence: number, courseId: number, completedAt?: string | null) {
   const baseDate = parseBridgeDate(completedAt) ?? new Date()
   const year = baseDate.getUTCFullYear()
   const month = String(baseDate.getUTCMonth() + 1).padStart(2, "0")
   const day = String(baseDate.getUTCDate()).padStart(2, "0")

-  return `D360-${year}-${month}${day}-${employeeId}-${courseId}`
+  return `D360-${year}-${month}${day}-${folioSequence}-${courseId}`
 }
```

The call site is inside `upsertEmployeeCertificatesFromBridge`'s `.filter().map()` chain building Prisma operations. `folio_sequence` isn't known until the row is created (it's a DB-side `nextval()` default), so it must be fetched explicitly *before* building each new-certificate operation, and passed to both the `folio_sequence` column and `buildCertificateFolio`. This requires turning the `.map()` into an explicit loop (it needs to `await` the sequence fetch per new certificate):

```diff
   const newCertificates: { courseName: string; certificateUrl: string }[] = []

-  const operations = certificates
-    .filter(hasWpCourseId)
-    .map((certificate) => {
-      const existingCertificate = certificateByCourseId.get(certificate.wp_course_id)
-      const certificateUrl = certificate.certificate_url?.trim() || null
-      const issuedAt =
-        parseBridgeDate(certificate.completed_at) ??
-        existingCertificate?.issued_at ??
-        syncedAt
-
-      if (existingCertificate) {
-        return prisma.certificate.update({
-          where: { id: existingCertificate.id },
-          data: {
-            course_name: decodeHtmlEntities(certificate.title),
-            certificate_url: certificateUrl ?? existingCertificate.certificate_url,
-            issued_at: issuedAt,
-          },
-        })
-      }
-
-      if (!certificateUrl) {
-        return null
-      }
-
-      const courseName = decodeHtmlEntities(certificate.title)
-      newCertificates.push({ courseName, certificateUrl })
-
-      return prisma.certificate.create({
-        data: {
-          employee_id: employeeId,
-          wp_course_id: certificate.wp_course_id,
-          course_name: courseName,
-          reference_number: buildCertificateFolio(employeeId, certificate.wp_course_id, issuedAt.toISOString()),
-          certificate_url: certificateUrl,
-          issued_at: issuedAt,
-        },
-      })
-    })
-    .filter((operation) => operation !== null)
+  const operations: Array<ReturnType<typeof prisma.certificate.update> | ReturnType<typeof prisma.certificate.create>> = []
+
+  for (const certificate of certificates.filter(hasWpCourseId)) {
+    const existingCertificate = certificateByCourseId.get(certificate.wp_course_id)
+    const certificateUrl = certificate.certificate_url?.trim() || null
+    const issuedAt =
+      parseBridgeDate(certificate.completed_at) ??
+      existingCertificate?.issued_at ??
+      syncedAt
+
+    if (existingCertificate) {
+      operations.push(
+        prisma.certificate.update({
+          where: { id: existingCertificate.id },
+          data: {
+            course_name: decodeHtmlEntities(certificate.title),
+            certificate_url: certificateUrl ?? existingCertificate.certificate_url,
+            issued_at: issuedAt,
+          },
+        })
+      )
+      continue
+    }
+
+    if (!certificateUrl) {
+      continue
+    }
+
+    const courseName = decodeHtmlEntities(certificate.title)
+    newCertificates.push({ courseName, certificateUrl })
+
+    const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('certificates_folio_sequence_seq') AS nextval`
+    const folioSequence = Number(nextval)
+
+    operations.push(
+      prisma.certificate.create({
+        data: {
+          employee_id: employeeId,
+          wp_course_id: certificate.wp_course_id,
+          course_name: courseName,
+          folio_sequence: folioSequence,
+          reference_number: buildCertificateFolio(folioSequence, certificate.wp_course_id, issuedAt.toISOString()),
+          certificate_url: certificateUrl,
+          issued_at: issuedAt,
+        },
+      })
+    )
+  }
```

`certificateByCourseId`'s `Map` key type needs no change (`certificate.wp_course_id` stays `number`); only the `employee_id`-scoped `findMany` call above it (`prisma.certificate.findMany({ where: { employee_id: employeeId } })`) is already correct once `employeeId`'s own parameter type is `string`.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "^lib/employee-learning.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `255` (272 − 17 = 255).

- [ ] **Step 4: Manually confirm the folio redesign against the live database**

The `nextval()` sequence call is new code with no compile-time way to confirm it behaves correctly — write and run a throwaway script at the repo root (deleted after, matching Plan 1's Task 3 convention):

```js
// verify-folio-sequence.mjs
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const [{ nextval: a }] = await prisma.$queryRaw`SELECT nextval('certificates_folio_sequence_seq') AS nextval`
const [{ nextval: b }] = await prisma.$queryRaw`SELECT nextval('certificates_folio_sequence_seq') AS nextval`
console.log("sequential:", Number(a), Number(b), Number(b) === Number(a) + 1)

await prisma.$disconnect()
await pool.end()
```

Run:
```bash
set -a; source .env; set +a
node verify-folio-sequence.mjs
rm verify-folio-sequence.mjs
```
Expected: prints two increasing integers with `sequential: <n> <n+1> true`. This confirms `nextval()` is callable through the Prisma adapter exactly the way the new code in Step 2 calls it (same `$queryRaw` tagged-template form) before trusting it inside the actual sync path, which won't get exercised until Plan 3 wires a caller that has real bridge data to sync.

- [ ] **Step 5: Commit**

```bash
git add lib/employee-learning.ts
git commit -m "feat(uuid): convert employee-learning to string employee IDs, rebase folio on folio_sequence"
```

---

### Task 6: `lib/dc3-pdf.ts` + `lib/certificates.ts`

**Files:**
- Modify: `lib/dc3-pdf.ts`
- Modify: `lib/certificates.ts`

**Interfaces:**
- Consumes: `PortalCertificateRecord`/`PortalCourseRecord` from Task 1.
- Produces: `Dc3GenerateInput.certificateId: string`, `generateDc3Pdf`, `getOrCreateDc3PdfBytes` — consumed by Plan 3's `app/api/certificates/[id]/dc3/route.ts` and `app/api/certificates/zip/route.ts`. `getCompanyCertificatesRecord(companyId: string)`, `CompanyEmployee.id: string` — consumed by Plan 3's certificates pages.

5 `tsc` errors in `dc3-pdf.ts`, 1 in `certificates.ts`, both tsc-flagged.

- [ ] **Step 1: Edit `lib/dc3-pdf.ts`**

```diff
 export type Dc3GenerateInput = {
-  certificateId: number
+  certificateId: string
 }
```

No other line in this file needs a manual edit — `certificate.employee`, `employee.company`, `cached.employee.company_id`, `cached.employee_id` are all Prisma-inferred and already resolve to `string` once the `where: { id: certificateId }` clauses type-check against a `string`. The two `Property 'employee' does not exist` errors (lines 67, 225 in the pre-fix file) were a cascading effect of the `where` clause type mismatch confusing Prisma's overload resolution, not a real structural problem — they resolve once `certificateId` itself is `string`.

- [ ] **Step 2: Edit `lib/certificates.ts`**

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
-export async function getCompanyCertificatesRecord(companyId: number) {
+export async function getCompanyCertificatesRecord(companyId: string) {
```

`PendingCertificate.id: string` (built as `` `${employee.id}-${course.wp_course_id}` `` — a composite display string, already typed `string`, already correct, not a UUID column) needs no edit.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^lib/(dc3-pdf|certificates)\.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `249` (255 − 5 − 1 = 249).

- [ ] **Step 4: Commit**

```bash
git add lib/dc3-pdf.ts lib/certificates.ts
git commit -m "feat(uuid): convert dc3-pdf and certificates to string IDs"
```

---

### Task 7: `lib/dashboard-cache.ts` + `lib/company-status.ts` + `lib/slug.ts` + `lib/company-branding.ts`

**Files:**
- Modify: `lib/dashboard-cache.ts`
- Modify: `lib/company-status.ts`
- Modify: `lib/slug.ts`
- Modify: `lib/company-branding.ts`

**Interfaces:**
- Consumes: `companyCacheRootTag`/`companyEmployeesTag`/`companyAssignmentsTag` from Task 1 (`dashboard-cache.ts` calls these).
- Produces: `getHrEmployeesSnapshot(companyId: string)`, `getHrAssignmentsSnapshot(companyId: string)`, `getCompanyAccessStatus(companyId: string)`, `ensureUniqueCompanySlug(name: string, excludeCompanyId?: string)`, `getCompanyBranding(companyId: string)`, `requireCompanySlug(companyId: string)` — all consumed by Plan 3's routes/actions/pages. `getCompanyAccessStatus` is also consumed by `auth.ts`, which needs **no edit of its own** — its one `tsc` error (`auth.ts(59,57)`, passing `usuario.company_id` — already `string` — into a `number`-typed parameter) resolves automatically once this task's `company-status.ts` edit lands; confirm this in Step 2 rather than touching `auth.ts`.

`dashboard-cache.ts` has 2 `tsc` errors (both in `where: { id: companyId }` clauses — confirmed by direct grep that no other function in this ~400-line file takes a `companyId` parameter), `company-status.ts` has 2, `slug.ts` has 1, `company-branding.ts` has 1 — all four files tsc-flagged, `auth.ts`'s error is a downstream consequence counted separately.

- [ ] **Step 1: Edit all four files**

`lib/dashboard-cache.ts`:
```diff
-export async function getHrEmployeesSnapshot(companyId: number) {
+export async function getHrEmployeesSnapshot(companyId: string) {
```
```diff
-export async function getHrAssignmentsSnapshot(companyId: number) {
+export async function getHrAssignmentsSnapshot(companyId: string) {
```

`lib/company-status.ts`:
```diff
-export async function getCompanyAccessStatus(companyId: number): Promise<CompanyAccessStatus> {
+export async function getCompanyAccessStatus(companyId: string): Promise<CompanyAccessStatus> {
```

`lib/slug.ts`:
```diff
-export async function ensureUniqueCompanySlug(name: string, excludeCompanyId?: number): Promise<string> {
+export async function ensureUniqueCompanySlug(name: string, excludeCompanyId?: string): Promise<string> {
```

`lib/company-branding.ts`:
```diff
-export const getCompanyBranding = cache(async (companyId: number) => {
+export const getCompanyBranding = cache(async (companyId: string) => {
   return prisma.company.findUnique({
     where: { id: companyId },
     select: { slug: true, logo_url: true, name: true },
   })
 })

-export async function requireCompanySlug(companyId: number) {
+export async function requireCompanySlug(companyId: string) {
   const branding = await getCompanyBranding(companyId)
   if (!branding) redirect("/login")
   return branding.slug
 }
```

- [ ] **Step 2: Verify, including `auth.ts`'s downstream resolution**

```bash
npx tsc --noEmit 2>&1 | grep -E "^(lib/(dashboard-cache|company-status|slug|company-branding)\.ts|auth\.ts)"
```
Expected: no output — this single check covers all four edited files AND confirms `auth.ts`'s error is gone without having touched it.

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `242` (249 − 2 dashboard-cache − 2 company-status − 1 slug − 1 company-branding − 1 auth.ts-resolved-automatically = 242).

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard-cache.ts lib/company-status.ts lib/slug.ts lib/company-branding.ts
git commit -m "feat(uuid): convert dashboard-cache, company-status, slug, and company-branding to string company IDs"
```

---

### Task 8: `lib/wordpress-bridge.ts` (surgical — portal IDs sent as bridge payload data only)

**Files:**
- Modify: `lib/wordpress-bridge.ts`

**Interfaces:**
- Produces: `BridgeUpsertEmployeeInput.employeeId: string`, `BridgeUpsertEmployeeInput.companyId: string`, `BridgeDeleteEmployeeInput.employeeId?: string | null` — consumed by Plan 3's employee-creation/deletion action files (the ones that construct these input objects and call `bridgeUpsertEmployee`/`bridgeDeleteEmployee`).

**This file is NOT in `tsc`'s current error list at all** — confirmed by direct grep. It compiles cleanly today because nothing in the currently-compiled portion of the codebase constructs a `BridgeUpsertEmployeeInput`/`BridgeDeleteEmployeeInput` object literal yet with a mismatched type (the construction sites are in `app/` action files, all of which are already failing to compile for unrelated reasons before reaching this point — Plan 3's scope). This task exists so Plan 3's implementers find the correct target type already in place rather than having to make this judgment call themselves mid-task.

**Everything else in this file stays `number`**: `BridgeUpsertEmployeeResponse.wp_user_id`, `BridgeDeleteEmployeeInput.wpUserId`, every function that takes a raw `userId`/`courseIds` parameter for enrollment/access/certificate calls (`bridgeEnrollCourses`, `bridgeEnsureStudentAccess`, `bridgeGetStudentCourses`, `bridgeGetStudentCertificates`, etc.) — these are all WordPress/Tutor LMS's own numeric IDs, confirmed by tracing their call sites in `lib/course-sync.ts` (Task 4), which always pass `employee.wp_user_id`, never the portal `employee.id`.

- [ ] **Step 1: Edit the two input types**

```diff
 export type BridgeUpsertEmployeeInput = {
-  employeeId: number
-  companyId: number
+  employeeId: string
+  companyId: string
   companyName: string
   email: string
   firstName: string
   lastName: string
   password?: string
   department?: string | null
   position?: string | null
 }
```

```diff
 export type BridgeDeleteEmployeeInput = {
-  employeeId?: number | null
+  employeeId?: string | null
   wpUserId?: number | null
   email?: string | null
 }
```

The three internal usages at (pre-edit) lines 374, 376, and 393 — `employee_id: input.employeeId`, `id: input.companyId`, `employee_id: input.employeeId ?? null` — build the outbound JSON payload sent to the WordPress plugin and need no code change, only the type change above; they already just forward the field as-is into the request body.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "^lib/wordpress-bridge.ts"
```
Expected: no output (was already empty before this task; confirms the edit didn't introduce a new error).

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected: `242` (unchanged from Task 7's end state — this task's file wasn't contributing to the count).

```bash
npm run lint 2>&1 | tail -5
```
Expected: same baseline as every prior task (0 errors, 1 pre-existing unrelated warning).

- [ ] **Step 3: Commit**

```bash
git add lib/wordpress-bridge.ts
git commit -m "feat(uuid): convert wordpress-bridge employee/company payload fields to string IDs"
```

---

## Self-Review Notes (completed during authoring, not a step for the executor)

- **Spec coverage:** §3 (wp_* untouched) → every task explicitly states which fields in its files are WordPress-domain and excluded; Task 8 in particular exists because `wordpress-bridge.ts` mixes both domains in one file. §5 (folio_sequence, decoupled from `id`) → Task 5 Step 2, using `nextval()` fetched before the `create()` rather than a placeholder-then-update. §8 (verification approach: `tsc`/lint, no test suite) → every task's Step "Verify" follows this, plus Task 5 Step 4 adds a targeted live-DB check for the one piece of genuinely new runtime logic (`$queryRaw` sequence call) that `tsc` can't validate.
- **Placeholder scan:** none — every task has literal diffs or explicit "no change needed" callouts with the reasoning stated, not left implicit.
- **Type consistency:** traced every producer/consumer pair across tasks explicitly in each task's "Interfaces" block — `getActiveCompanyId(): string | null` (Task 1) → `lib/prisma.ts`'s untyped guard (verified, not edited, Task 1 Step 4); `notifyEmployeeNewCertificates(employeeId: string, ...)` (Task 3) → called from Task 5's `employee-learning.ts`; `syncSingleEmployeePackageEnrollment(employee: {id: string, ...})` (Task 4) → called from `jobs.ts`'s `processPackageEnrollmentSyncJob` in the same task. No signature drift found between tasks.
- **Expected error-count arithmetic double-checked**: 328 (Plan 1 baseline) − 7 (auditing) − 11 (access-control) − 12 (notifications) − 17 (course-sync) − 9 (jobs) − 17 (employee-learning) − 5 (dc3-pdf) − 1 (certificates) − 2 (dashboard-cache) − 2 (company-status) − 1 (slug) − 1 (company-branding) − 1 (auth.ts, resolved via company-status) = **242** remaining after Task 8. This matches the running totals stated in each task's Step "Verify" (310 → 298 → 272 → 255 → 249 → 242). If an implementer's actual count differs from a task's stated expectation, that is a signal to stop and investigate before continuing to the next task, not to silently continue — a wrong count usually means either a file outside this task's list also needed a change (a research gap in this plan) or a change was broader/narrower than intended.
- **Scope check:** this plan is appropriately sized as a single unit — 8 files' worth of tightly-interdependent core-library types that the rest of the app (Plan 3) can't be touched correctly without first landing. It does not bleed into `app/`, `components/`, or `prisma/seed.ts`, which remain Plan 3 and Plan 4 respectively.
