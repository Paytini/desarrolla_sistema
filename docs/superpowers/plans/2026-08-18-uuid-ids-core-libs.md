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
- This plan's own scope ends when every file listed across its 9 tasks is `tsc`-clean. It does **not** touch anything under `app/`, `components/`, or `prisma/seed.ts` — those are Plan 3 and Plan 4. Expect the overall repo-wide `tsc --noEmit` count to still be large after this plan lands; that remainder is exactly Plan 3's scope. Verification in every task below tracks a `lib/`-plus-auth-infra-*scoped* count (`grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)"`), not the whole-repo count — the whole-repo number moves for reasons outside this plan's control as `app/`/`components/` files react to `lib/` types changing underneath them before Plan 3 fixes them (see Task 2's note, added after this was discovered mid-execution).

---

### Task 1: Foundational type infrastructure — `lib/tenant-context.ts`, `lib/cache-tags.ts`, `lib/learning-types.ts`

**Files:**
- Modify: `lib/tenant-context.ts`
- Modify: `lib/cache-tags.ts`
- Modify: `lib/learning-types.ts`

**Interfaces:**
- Produces: `getActiveCompanyId(): string | null`, `enterCompanyContext(companyId: string): void` — consumed by `lib/prisma.ts`'s tenant-guard extension (no code change needed there — verify, don't edit, per Step 3 below) and by `lib/auth-guards.ts` (see Task 2, added mid-execution). `companyCacheRootTag(companyId: string)`, `companyEmployeesTag(companyId: string)`, `companyAssignmentsTag(companyId: string)`, `getCompanyDashboardTags(companyId: string)` — consumed by Task 8 (`dashboard-cache.ts`) and by Plan 3's route/action files. `PortalCourseRecord`/`PortalCertificateRecord`/`PortalPackageCourseRecord` with `id`/`employee_id`/`package_id` as `string` (optional variants stay optional) and `wp_course_id` unchanged as `number` — consumed by Task 7 (`certificates.ts`) and by Plan 3's UI components.

None of these three files appear in `npx tsc --noEmit`'s current output — confirmed by direct grep before writing this plan. They still need this change: their `number`-typed IDs flow into template literals (`cache-tags.ts`) or an `AsyncLocalStorage<number>` that's only ever read into an untyped object spread (`tenant-context.ts` → `lib/prisma.ts`), so a real type mismatch would never surface as a compile error even though passing a UUID string into a variable declared `number` is wrong. `learning-types.ts` is a set of standalone type aliases nothing currently assigns a raw Prisma row into directly, so nothing trips today — but Task 7 does exactly that assignment. (What this confirmed-clean-today status did NOT predict: editing `tenant-context.ts` alone was enough to surface a real error one file away, in `lib/auth-guards.ts` — see Task 2.)

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
Expected: this step's own file-scoped check (above) should show no output regardless of the whole-repo count. The whole-repo count itself is NOT a reliable check at this point in the plan (see the Self-Review Notes at the bottom of this document for why) — historically it landed at 340 here, not the 328 originally predicted, which is exactly what led to Task 2 being added. Do not treat a divergence here as a problem on its own; treat it as a signal to check per-file, the way Task 2 was found.

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

### Task 2: Session/JWT type augmentation — `types/next-auth.d.ts` + `auth.config.ts` + `lib/company-status.ts`

**Discovered mid-execution, not in the original research pass:** Task 1's edit to `lib/tenant-context.ts` immediately surfaced a real `tsc` error in `lib/auth-guards.ts(28,23)` (`enterCompanyContext(session.user.empresa_id)` — argument type `number` not assignable to `string`) that did not exist in the Plan 1 baseline and was not in this plan's original 8-task file list. Root cause: `types/next-auth.d.ts` declares `Session.user.empresa_id` and `JWT.empresa_id` as `number | null`, and `auth.config.ts`'s two callbacks cast values into/out of that field using `as number | null`. `auth.ts:75` already assigns `empresa_id: usuario.company_id` (already a `string` post-Plan-1, no change needed there), but the *type declarations* never caught up. This task fixes that.

**A second finding surfaced live during this task's own dispatch, not caught when it was inserted:** `lib/auth-guards.ts` calls `getCompanyAccessStatus(session.user.empresa_id)` on the very next line after `enterCompanyContext(session.user.empresa_id)` (both at the same call site, same value). Fixing only the Session/JWT type still left `lib/auth-guards.ts` erroring — just on the other call. `getCompanyAccessStatus` was originally scoped to (old-numbering) Task 7, three tasks away. Since `lib/auth-guards.ts` genuinely cannot be made clean without both fixes landing together, `lib/company-status.ts`'s already-planned one-line signature change (`companyId: number` → `string`, identical to what was going to happen later) was pulled forward into this task instead of leaving `lib/auth-guards.ts` in a still-broken state until much later. **This is now reflected here and removed from the task that used to be numbered 7 (`lib/dashboard-cache.ts` + `lib/company-status.ts` + `lib/slug.ts` + `lib/company-branding.ts`, now Task 8) — see that task's updated file list.** This also means `auth.ts`'s one `tsc` error (which depends on `getCompanyAccessStatus`, not on anything Session/JWT-typed) resolves here too, three tasks earlier than originally planned.

This task was inserted here, after Task 1 and before the original Task 2 (now Task 3), because it's foundational session-typing infrastructure in the same vein as Task 1 and because `lib/auth-guards.ts` (used by every RH-scoped and SUPERADMIN-scoped route) depends on it.

**Files:**
- Modify: `types/next-auth.d.ts`
- Modify: `auth.config.ts`
- Modify: `lib/company-status.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (this task's files don't import `tenant-context.ts`), but its fix is what makes Task 1's `enterCompanyContext(companyId: string)` actually callable from `lib/auth-guards.ts` without a type error.
- Produces: `Session.user.empresa_id: string | null`, `JWT.empresa_id: string | null`, `getCompanyAccessStatus(companyId: string)` — consumed by `lib/auth-guards.ts` (verify only, do not edit — its `if (!session.user.empresa_id) { redirect(...) }` guard already narrows the type correctly via `next/navigation`'s `redirect()` having a `never` return type, so the rest of that function already treats `empresa_id` as non-null `string` once this task lands, for both of its calls) and by `auth.ts` (verify only, do not edit — resolves automatically the same way it was originally going to via the old Task 7) and by every `app/` file that reads `session.user.empresa_id` or calls `getCompanyAccessStatus` (Plan 3's job to convert their own usages — this task only needs to make the *types* correct, not touch any `app/` file).

- [ ] **Step 1: Edit `types/next-auth.d.ts`**

```diff
 declare module "next-auth" {
   interface Session {
     user: {
       id: string
       rol: string
-      empresa_id: number | null
+      empresa_id: string | null
       nombre: string
       empresa?: string
       empresa_slug?: string
     } & DefaultSession["user"]
   }
 }

 declare module "next-auth/jwt" {
   interface JWT {
     id?: string
     rol?: string
-    empresa_id?: number | null
+    empresa_id?: string | null
     nombre?: string
     empresa?: string | null
     empresa_slug?: string | null
   }
 }
```

- [ ] **Step 2: Edit `auth.config.ts`**

```diff
     async jwt({ token, user }) {
       if (user) {
         token.id = user.id
         token.rol = (user as { rol?: string }).rol
-        token.empresa_id = (user as { empresa_id?: number | null }).empresa_id
+        token.empresa_id = (user as { empresa_id?: string | null }).empresa_id
         token.nombre = (user as { nombre?: string }).nombre
         token.empresa = (user as { empresa?: string | null }).empresa
         token.empresa_slug = (user as { empresa_slug?: string | null }).empresa_slug
       }
       return token
     },
     async session({ session, token }) {
       session.user.id = token.id as string
       session.user.rol = token.rol as string
-      session.user.empresa_id = token.empresa_id as number | null
+      session.user.empresa_id = token.empresa_id as string | null
       session.user.nombre = token.nombre as string
       session.user.empresa = token.empresa as string | undefined
       session.user.empresa_slug = token.empresa_slug as string | undefined
       return session
     },
```

- [ ] **Step 3: Edit `lib/company-status.ts`**

```diff
-export async function getCompanyAccessStatus(companyId: number): Promise<CompanyAccessStatus> {
+export async function getCompanyAccessStatus(companyId: string): Promise<CompanyAccessStatus> {
```

- [ ] **Step 4: Verify, including `lib/auth-guards.ts`'s and `auth.ts`'s automatic resolution**

```bash
npx tsc --noEmit 2>&1 | grep -E "^(types/next-auth\.d\.ts|auth\.config\.ts|auth\.ts|lib/(auth-guards|company-status)\.ts)"
```
Expected: no output — confirms all three edited files stay clean AND both `lib/auth-guards.ts` and `auth.ts`'s errors are gone without having touched either.

```bash
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `87` (91 − 1 `auth-guards.ts` − 2 `company-status.ts` − 1 `auth.ts` = 87). This grep scopes to `lib/` plus the two root-level auth infrastructure files plus `auth.ts` — the count that matters for this plan. From here on, every task's verification uses this same lib/-plus-auth-infra scoped count instead of the whole-repo total (see the note below).

**Why this task switches to a scoped count instead of the whole-repo total:** the original plan tracked the full `npx tsc --noEmit | grep -c "error TS"` count end to end, assuming it would only move by each task's own expected delta. Task 1 proved that assumption wrong in two ways: (1) tightening a shared type can surface *new* errors in an as-yet-unscoped file (this task itself exists because of exactly that), and (2) `app/` and `components/` files — entirely out of this plan's scope — have their own error counts shifting for reasons this plan doesn't control as `lib/` types change underneath them (confirmed: comparing the full list before/after Task 1, several `app/` files' counts moved by ±1-5 with no `lib/`-side explanation traceable to anything this plan touched). A whole-repo count conflates in-scope drift with out-of-scope noise; a `lib/`-plus-auth-infra-scoped count doesn't.

- [ ] **Step 5: Commit**

```bash
git add types/next-auth.d.ts auth.config.ts lib/company-status.ts
git commit -m "feat(uuid): convert Session/JWT and getCompanyAccessStatus empresa_id types to string"
```

---

### Task 3: `lib/auditing.ts` + `lib/access-control.ts`

**`lib/wordpress-bridge.ts` gains one surgical edit mid-execution:** `lib/access-control.ts`'s `deleteEmployeeRecord` calls `bridgeDeleteEmployee({ employeeId: employee.id, ... })`. Once `employeeId` is `string` (this task), that call needs `BridgeDeleteEmployeeInput.employeeId` to also be `string | null` — one of the two fields originally scoped to (old-numbering) Task 8, now Task 9. Only this one field moves here; `BridgeUpsertEmployeeInput.employeeId`/`companyId` stay in Task 9, since nothing in this task's two files constructs that type. **Task 9's file list and diff have been updated to drop this field — do not reapply it there.**

**Files:**
- Modify: `lib/auditing.ts`
- Modify: `lib/access-control.ts`
- Modify: `lib/wordpress-bridge.ts` (one field only — see above)

**Interfaces:**
- Consumes: nothing from Task 1 directly (these two files don't import `tenant-context`/`cache-tags`/`learning-types`).
- Produces: `AuditActor.userId: string | null`, `getCompanySeatSnapshot(companyId: string)`, `createAuditEvent(input: { entityId?: string | null; companyId?: string | null; ... })`, `createSeatHistoryEntry(input: { companyId: string; ... })` — consumed by Plan 3's action files (confirmed by grep: no file in this plan's remaining tasks imports `lib/auditing.ts`). `deleteEmployeeRecord(options: { employeeId: string; companyId?: string; ... })`, `togglePortalUserStatus(userId: string, ...)`, `revokeUserPortalSessions(userId: string)`, `revokePortalSession(sessionId: string)` — consumed by Plan 3. `BridgeDeleteEmployeeInput.employeeId: string | null` — consumed by `lib/access-control.ts`'s own `bridgeDeleteEmployee` call in this same task.

`lib/auditing.ts` has 7 `tsc` errors today, `lib/access-control.ts` has 11 — both tsc-flagged. `lib/wordpress-bridge.ts` was not tsc-flagged before this task (nothing called `bridgeDeleteEmployee` with a `string` yet) but would become flagged (+1) the moment `access-control.ts`'s edit lands without this accompanying fix.

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

- [ ] **Step 3: Edit `lib/wordpress-bridge.ts` (one field)**

```diff
 export type BridgeDeleteEmployeeInput = {
-  employeeId?: number | null
+  employeeId?: string | null
   wpUserId?: number | null
   email?: string | null
 }
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^lib/(auditing|access-control|wordpress-bridge)\.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `69` (87 − 7 auditing − 11 access-control = 69; `wordpress-bridge.ts`'s fix is what keeps this at exactly 69 instead of overshooting to 70 — without it, `access-control.ts`'s edit alone would introduce +1 new error there). This is the lib/-plus-auth-infra-scoped count established in Task 2 — not the whole-repo count, which fluctuates for reasons outside this plan's scope (see Task 2's note).

- [ ] **Step 5: Commit**

```bash
git add lib/auditing.ts lib/access-control.ts lib/wordpress-bridge.ts
git commit -m "feat(uuid): convert auditing and access-control to string IDs"
```

---

### Task 4: `lib/notifications.ts`

**Files:**
- Modify: `lib/notifications.ts`

**Interfaces:**
- Produces: `notifySuperadmins(content: NotifyContent & { excludeUsuarioId?: string | null })`, `notifyCompanyRH(companyId: string, ...)`, `notifyEmployeeNewCertificates(employeeId: string, ...)`, `getRecentNotifications(userId: string, ...)`, `getUnreadNotificationCount(userId: string)`, `markAllNotificationsRead(userId: string)` — `notifyEmployeeNewCertificates` is consumed by Task 6 (`employee-learning.ts`), so this task must land before Task 6.

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
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `57` (69 − 12 = 57), using the same scoped count as Task 3.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat(uuid): convert notifications to string IDs"
```

---

### Task 5: `lib/course-sync.ts` + `lib/jobs.ts`

**Files:**
- Modify: `lib/course-sync.ts`
- Modify: `lib/jobs.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1-3.
- Produces: `PackageEnrollmentSyncPayload` (in `jobs.ts`) with `companyId: string`, `employeeIds: string[]`, `processedEmployeeIds: string[]` — this is the shape stored in `Job.payload` (untyped `Json` column; the type only exists in application code, so this change is purely about what values get written/read, not a schema change). `syncSingleEmployeePackageEnrollment(employee: { id: string; wp_user_id: number | null }, ...)`, `PackageEnrollmentSyncResult.employeeId: string`, `enqueuePackageEnrollmentSyncJob(companyId: string)`, `setCourseAssignment(companyId: string, courseId: number, ..., employeeIds: string[], ...)`, `markEmployeeCourseAccessError(employeeId: string, courseIds: number[], ...)`, `upsertEmployeePackageCourses(employeeId: string, ...)`, `replaceEmployeePackageCourses(employeeId: string, ...)` — consumed by Plan 3's action files. `processPendingJobs`'s internal `job.id`/`candidate.id` (already `string` from Prisma) and `processPackageEnrollmentSyncJob(jobId: string, ...)`.

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
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `31` (57 − 17 − 9 = 31), scoped count.

- [ ] **Step 4: Commit**

```bash
git add lib/course-sync.ts lib/jobs.ts
git commit -m "feat(uuid): convert course-sync and jobs to string employee/company IDs"
```

---

### Task 6: `lib/employee-learning.ts` (+ folio_sequence redesign)

**One pre-existing wrapper to clean up, left by Task 4:** Task 4's dispatch found that `notifyEmployeeNewCertificates`'s now-`string` parameter broke the call at (pre-edit) line 206, `await notifyEmployeeNewCertificates(employeeId, newCertificates)`, since this file's `employeeId` was still `number`-typed at the time. Rather than converting this whole file early, Task 4 wrapped just that call site: `notifyEmployeeNewCertificates(String(employeeId), newCertificates)`. This is safe at runtime (the underlying value is already a real UUID string post-Plan-1; `String()` on a string is a no-op) but becomes redundant once this task converts `employeeId`'s own type to `string`. **As part of this task, remove the now-unnecessary `String(...)` wrapper** — change that line back to `notifyEmployeeNewCertificates(employeeId, newCertificates)` — once `employeeId` is properly `string`-typed by this task's own edits. This isn't in the diff blocks below (they don't touch that line at all); do it as a small additional edit and mention it in your report.

**Files:**
- Modify: `lib/employee-learning.ts`

**Interfaces:**
- Consumes: `notifyEmployeeNewCertificates(employeeId: string, ...)` from Task 4.
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
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `14` (31 − 17 = 14), scoped count.

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

### Task 7: `lib/dc3-pdf.ts` + `lib/certificates.ts`

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
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `8` (14 − 5 − 1 = 8), scoped count.

- [ ] **Step 4: Commit**

```bash
git add lib/dc3-pdf.ts lib/certificates.ts
git commit -m "feat(uuid): convert dc3-pdf and certificates to string IDs"
```

---

### Task 8: `lib/dashboard-cache.ts` + `lib/slug.ts` + `lib/company-branding.ts`

**`lib/company-status.ts` was removed from this task's scope mid-execution:** it was pulled forward into Task 2, because `lib/auth-guards.ts` needed both `enterCompanyContext` (Task 1) and `getCompanyAccessStatus` (originally here) fixed together to become `tsc`-clean at all — see Task 2's note. Its diff and verification are no longer part of this task; do not attempt to re-apply it here, the file is already on `companyId: string`.

**Files:**
- Modify: `lib/dashboard-cache.ts`
- Modify: `lib/slug.ts`
- Modify: `lib/company-branding.ts`

**Interfaces:**
- Consumes: `companyCacheRootTag`/`companyEmployeesTag`/`companyAssignmentsTag` from Task 1 (`dashboard-cache.ts` calls these).
- Produces: `getHrEmployeesSnapshot(companyId: string)`, `getHrAssignmentsSnapshot(companyId: string)`, `ensureUniqueCompanySlug(name: string, excludeCompanyId?: string)`, `getCompanyBranding(companyId: string)`, `requireCompanySlug(companyId: string)` — all consumed by Plan 3's routes/actions/pages.

`dashboard-cache.ts` has 6 `tsc` errors as of this task's dispatch (2 in the `where: { id: companyId }` clauses this task already targets, plus 4 more that appeared once Task 1 tightened `companyCacheRootTag`/`companyEmployeesTag`/`companyAssignmentsTag` to expect `string` — the `tags: [companyCacheRootTag(companyId), ...]` calls at lines 341 and 384 now also error; confirmed by direct grep that no other function in this ~400-line file takes a `companyId` parameter, so this task's already-planned two-function-signature fix resolves all 6, not just the original 2). `slug.ts` has 1, `company-branding.ts` has 1 — all three remaining files tsc-flagged.

- [ ] **Step 1: Edit all three files**

`lib/dashboard-cache.ts`:
```diff
-export async function getHrEmployeesSnapshot(companyId: number) {
+export async function getHrEmployeesSnapshot(companyId: string) {
```
```diff
-export async function getHrAssignmentsSnapshot(companyId: number) {
+export async function getHrAssignmentsSnapshot(companyId: string) {
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

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -E "^lib/(dashboard-cache|slug|company-branding)\.ts"
```
Expected: no output.

```bash
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `0` (8 − 6 dashboard-cache − 1 slug − 1 company-branding = 0). This is the last task expected to move this scoped count — it should read zero from here through Task 9.

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard-cache.ts lib/slug.ts lib/company-branding.ts
git commit -m "feat(uuid): convert dashboard-cache, slug, and company-branding to string company IDs"
```

---

### Task 9: `lib/wordpress-bridge.ts` (surgical — portal IDs sent as bridge payload data only)

**`BridgeDeleteEmployeeInput.employeeId` was pulled forward into Task 3**, not covered here: `lib/access-control.ts`'s `deleteEmployeeRecord` (Task 3) calls `bridgeDeleteEmployee({ employeeId: employee.id, ... })`, so that one field had to move with it or `lib/access-control.ts` couldn't have gone `tsc`-clean in Task 3. Only `BridgeUpsertEmployeeInput`'s two fields remain here.

**Files:**
- Modify: `lib/wordpress-bridge.ts`

**Interfaces:**
- Produces: `BridgeUpsertEmployeeInput.employeeId: string`, `BridgeUpsertEmployeeInput.companyId: string` — consumed by Plan 3's employee-creation action file (the one that constructs this input object and calls `bridgeUpsertEmployee`). `BridgeDeleteEmployeeInput.employeeId` is already `string | null` as of Task 3 — do not re-edit it here.

**This file was NOT in `tsc`'s current error list at all** when this plan was authored — confirmed by direct grep. It compiled cleanly at the time because nothing in the currently-compiled portion of the codebase constructed a `BridgeUpsertEmployeeInput`/`BridgeDeleteEmployeeInput` object literal yet with a mismatched type. Task 3's dispatch already proved this assumption has a real edge: `access-control.ts` DID construct one (`BridgeDeleteEmployeeInput`), which is why that field moved. `BridgeUpsertEmployeeInput` is constructed only in `app/` action files (Plan 3's scope, still failing to compile for unrelated reasons before reaching this point) — as of this task's dispatch, re-confirm with a fresh grep that nothing new in `lib/` (not just `app/`) constructs it before trusting that this task still doesn't move the scoped count.

**Everything else in this file stays `number`**: `BridgeUpsertEmployeeResponse.wp_user_id`, `BridgeDeleteEmployeeInput.wpUserId`, every function that takes a raw `userId`/`courseIds` parameter for enrollment/access/certificate calls (`bridgeEnrollCourses`, `bridgeEnsureStudentAccess`, `bridgeGetStudentCourses`, `bridgeGetStudentCertificates`, etc.) — these are all WordPress/Tutor LMS's own numeric IDs, confirmed by tracing their call sites in `lib/course-sync.ts` (Task 5), which always pass `employee.wp_user_id`, never the portal `employee.id`.

- [ ] **Step 1: Edit the one remaining input type**

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

The internal usages at (pre-edit) lines 374, 376 — `employee_id: input.employeeId`, `id: input.companyId` — build the outbound JSON payload sent to the WordPress plugin and need no code change, only the type change above; they already just forward the field as-is into the request body. Do not touch `BridgeDeleteEmployeeInput` — it was already converted in Task 3.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "^lib/wordpress-bridge.ts"
```
Expected: no output (was already empty before this task; confirms the edit didn't introduce a new error).

```bash
npx tsc --noEmit 2>&1 | grep -E "^(lib/|auth\.ts|auth\.config\.ts|types/next-auth\.d\.ts)" | grep -c "error TS"
```
Expected: `0` (unchanged from Task 8's end state — this task's file wasn't contributing to the scoped count, since it was already `tsc`-clean before this plan started and its remaining field, `BridgeUpsertEmployeeInput`, still isn't constructed anywhere in `lib/`). If this is nonzero, stop and check — by this point in the plan, two prior tasks (1 and 3) each found a real gap exactly this way.

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

- **Spec coverage:** §3 (wp_* untouched) → every task explicitly states which fields in its files are WordPress-domain and excluded; Task 9 in particular exists because `wordpress-bridge.ts` mixes both domains in one file. §5 (folio_sequence, decoupled from `id`) → Task 6 Step 2, using `nextval()` fetched before the `create()` rather than a placeholder-then-update. §8 (verification approach: `tsc`/lint, no test suite) → every task's Step "Verify" follows this, plus Task 6 Step 4 adds a targeted live-DB check for the one piece of genuinely new runtime logic (`$queryRaw` sequence call) that `tsc` can't validate.
- **Placeholder scan:** none — every task has literal diffs or explicit "no change needed" callouts with the reasoning stated, not left implicit.
- **Type consistency:** traced every producer/consumer pair across tasks explicitly in each task's "Interfaces" block — `getActiveCompanyId(): string | null` (Task 1) → `lib/prisma.ts`'s untyped guard (verified, not edited, Task 1 Step 4); `Session.user.empresa_id: string | null` (Task 2) → `lib/auth-guards.ts`'s `enterCompanyContext()` call (verified, not edited, Task 2 Step 3); `notifyEmployeeNewCertificates(employeeId: string, ...)` (Task 4) → called from Task 6's `employee-learning.ts`; `syncSingleEmployeePackageEnrollment(employee: {id: string, ...})` (Task 5) → called from `jobs.ts`'s `processPackageEnrollmentSyncJob` in the same task. No signature drift found between tasks.
- **Expected error-count arithmetic** (scoped to `lib/` + `auth.ts` + `auth.config.ts` + `types/next-auth.d.ts`, not the whole repo — see Task 2's note): 91 (measured live after Task 1 landed — not the 86 originally estimated from the pre-Task-1 baseline, since Task 1's own edit surfaced errors in `dashboard-cache.ts` (+4) and previously-unscoped `lib/auth-guards.ts` (+1)) − 1 (Task 2, auth-guards.ts) − 2 (Task 2, company-status.ts — pulled forward from the original Task 7 mid-dispatch, see Task 2's note) − 1 (Task 2, auth.ts, resolved as a side effect of company-status.ts moving earlier) − 7 (Task 3, auditing) − 11 (Task 3, access-control) − 12 (Task 4, notifications) − 17 (Task 5, course-sync) − 9 (Task 5, jobs) − 17 (Task 6, employee-learning) − 5 (Task 7, dc3-pdf) − 1 (Task 7, certificates) − 6 (Task 8, dashboard-cache) − 1 (Task 8, slug) − 1 (Task 8, company-branding) = **0** remaining after Task 8, unchanged through Task 9. Running totals per task: 91 → 87 → 69 → 57 → 31 → 14 → 8 → 0 → 0, matching each task's Step "Verify". This plan's own execution is the proof this check matters, twice over: Task 1's actual count (340 whole-repo / 91 scoped) diverged from the plan's original prediction (328 whole-repo, no scoped tracking existed yet), which is what triggered finding `lib/auth-guards.ts` and the two auth-typing files; then Task 2's own dispatch produced 87 against a first-corrected prediction of 90, which is what caught that `lib/auth-guards.ts`'s *second* call (`getCompanyAccessStatus`) also needed a fix, pulling `lib/company-status.ts` forward from Task 8. If a future implementer's count diverges from a task's stated expectation, treat that the same way both times did: stop and investigate before continuing, don't assume the plan's number was just approximate.
- **Scope check:** this plan is appropriately sized as a single unit — 9 tasks covering the core-library and auth-typing infrastructure that the rest of the app (Plan 3) can't be touched correctly without first landing. It does not bleed into `app/`, `components/`, or `prisma/seed.ts`, which remain Plan 3 and Plan 4 respectively. Three corrections happened mid-execution, each recorded here rather than silently smoothed over: Task 2 (Session/JWT typing) was added once Task 1's dispatch surfaced it live; Task 8 shrank from four files to three when `lib/company-status.ts` was pulled forward into Task 2 for the same reason; and Task 9 shrank from two `lib/wordpress-bridge.ts` fields to one when `BridgeDeleteEmployeeInput.employeeId` was pulled forward into Task 3 (its caller, `lib/access-control.ts`'s `deleteEmployeeRecord`, is a Task 3 file). A future reader comparing this document against the ledger can see why the task boundaries moved.
