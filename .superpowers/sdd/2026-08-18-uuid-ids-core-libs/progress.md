# SDD ledger — plan: docs/superpowers/plans/2026-08-18-uuid-ids-core-libs.md

Spec: docs/superpowers/specs/2026-08-18-random-uuid-ids-design.md (binding authority)
Prior plan: docs/superpowers/plans/2026-08-18-uuid-ids-schema-migration.md (Plan 1, merged into this branch's history — PR #13 open against docs/uuid-ids-design)
Worktree: .worktrees/feat-uuid-core-libs (branch feat/uuid-primary-keys-core-libs, stacked on feat/uuid-primary-keys-schema @ 118733a)
Baseline: npx tsc --noEmit = 328 errors (matches Plan 1's Task 3 baseline exactly, reconfirmed fresh in this worktree). npm run lint clean (0 errors, 1 pre-existing unrelated warning).

## Pre-flight conflict scan

| Pair | Task A produces | Task B consumes | Finding |
|---|---|---|---|
| Task 1 -> Task 7 | companyCacheRootTag/companyEmployeesTag/companyAssignmentsTag(companyId: string) | dashboard-cache.ts calls these | Clean — Task 7 dispatched after Task 1 |
| Task 3 -> Task 5 | notifyEmployeeNewCertificates(employeeId: string, ...) | employee-learning.ts imports and calls it | Clean — Task 5 dispatched after Task 3 |
| Task 4 -> Task 5 | course-sync.ts's exports not directly consumed by employee-learning.ts (checked: no import) | — | Clean, no dependency found despite both being "learning sync" adjacent |
| Task 1 -> Task 6 | PortalCertificateRecord/PortalCourseRecord(id/employee_id: string) | certificates.ts's CompanyEmployee references these types | Clean — Task 6 dispatched after Task 1 |
| Task 7 -> auth.ts | getCompanyAccessStatus(companyId: string) | auth.ts calls it, needs zero edits of its own | Clean — Task 7 Step 2 explicitly verifies auth.ts resolves without being touched |
| All tasks self-consistency | Each task's diffs traced against its own stated Interfaces block for internal contradiction | — | Clean, no task's own diffs contradict its own stated produces/consumes |

Scan clean. No rulings needed before dispatch. Task execution order follows the plan's numbering (1-8) since several tasks have real produces/consumes dependencies on earlier ones (3->5, 1->6/7).

Note: the table above uses the plan's ORIGINAL numbering, before Task 2 (Session/JWT typing) was inserted mid-execution and tasks 2-8 were renumbered to 3-9. Historical record, not corrected in place — see the "Ruling" entries below for the actual final task numbers and what happened. Under the current numbering: old Task 1 -> Task 7 is now Task 1 -> Task 8 (dashboard-cache.ts); old Task 3 -> Task 5 is now Task 4 -> Task 6 (notifications -> employee-learning); old Task 4 -> Task 5 is now Task 5 -> Task 6; old Task 1 -> Task 6 is now Task 1 -> Task 7; old Task 7 -> auth.ts is now Task 8 -> auth.ts.

## Task 1
Task 1: complete (commit 6f9ce0a..56df052, review clean)

Ruling: Task 1's dispatch surfaced a real tsc error in lib/auth-guards.ts (not in this plan's original 9-file... originally-8-file research) plus a whole-repo tsc count of 340 vs the predicted 328. Investigated directly (not delegated): root cause is types/next-auth.d.ts + auth.config.ts still declaring/casting empresa_id as number, which lib/auth-guards.ts's now-string-typed enterCompanyContext() call correctly flags. Also found the plan's whole-repo count-tracking methodology was flawed (app/ files drift independently of anything this plan controls). Fixed both: inserted a new Task 2 (Session/JWT typing) into the plan document, renumbered old Tasks 2-8 to 3-9, and switched every task's verification to a lib/-plus-auth-infra-scoped tsc count instead of the whole-repo count. Plan document re-committed (c48871b) with the correction. Cost if this ruling is wrong: low — worst case a task's "Expected: N" line is off by a small amount, which the next task's own Step "Verify" would catch immediately (scoped count, not whole-repo, so drift is now attributable). Task 1's own diff (the three files it edited) required no changes as a result of this ruling; only the plan's remaining tasks and dispatch order were affected.

## Task 2
Ruling: implementer (agent a1cd305ec20ea9edb) correctly extended Task 2's scope to include lib/company-status.ts beyond the brief's 2 named files, because lib/auth-guards.ts calls both enterCompanyContext AND getCompanyAccessStatus with the same session.user.empresa_id value -- fixing only the Session/JWT type would have left auth-guards.ts still broken on the second call. This was a real gap in Task 2's own design (missed when Task 2 was inserted after Task 1's discovery). Controller verified the deviation (git show 535abb2 -- lib/company-status.ts) and confirmed it's byte-identical to what the original Task 7 (now Task 8) already planned for that file -- not scope creep, just correctly reordered. Updated the plan document (commit 77ff6ab) to move lib/company-status.ts's diff into Task 2 permanently, shrink Task 8 to three files, and recompute all downstream running-total expectations (91 -> 87 -> 69 -> 57 -> 31 -> 14 -> 8 -> 0 -> 0). Cost if wrong: low, same reasoning as the Task 1 ruling -- each task's own scoped verify step catches drift immediately.
Task 2: complete (commit 535abb2, review clean, scoped count confirmed 87)

## Task 3
Ruling: implementer (agent a58a220feff2ef427) correctly extended scope to lib/wordpress-bridge.ts's BridgeDeleteEmployeeInput.employeeId field, one field beyond the brief's 2 named files, because lib/access-control.ts's deleteEmployeeRecord calls bridgeDeleteEmployee({employeeId: employee.id, ...}) -- verified via git show 0cbd0c8 -- lib/wordpress-bridge.ts (single-field diff, matches exactly what Task 9 already had planned for that one field). Updated the plan (commit e12507d): Task 3 permanently gains this field, Task 9 drops to a single remaining field (BridgeUpsertEmployeeInput). Scoped count arithmetic unaffected (Task 3 still lands at 69 as predicted -- the implementer's own investigation is what kept it at 69 instead of overshooting to 70). Cost if wrong: low, same as prior rulings.
Task 3: complete (commit 0cbd0c8, review clean, scoped count confirmed 69)

## Task 4
Ruling: implementer (agent a8fad018bbe09e99a) found lib/employee-learning.ts(206) calling notifyEmployeeNewCertificates(employeeId, ...) with a still-number-typed employeeId (that file is Task 6's job, not yet run). Rather than pulling Task 6's whole scope forward, wrapped just the call site in String(employeeId) -- a no-op at runtime since the actual value is already a UUID string post-Plan-1, just mistyped by not-yet-converted code. Verified via git show 6294226 -- lib/employee-learning.ts: single-line change, matches this reasoning exactly. Added a note to Task 6 (commit 9716cbc) instructing it to remove the now-redundant String() wrapper once it properly types employeeId. Scoped count landed exactly on prediction (57), unlike Tasks 1-3's overshoots, because this workaround (rather than a real Task 6 file edit) was enough to keep the count in sync. Cost if wrong: low -- String() on a string is always safe, worst case is leftover dead-simple code Task 6 will clean up per the note.
Task 4: complete (commit 6294226, review clean, scoped count confirmed 57)
Task 4: minor (deferred): reviewer's safety-of-String()-cast reasoning (proof that a bad employeeId would throw earlier in the same transaction) isn't documented anywhere in the codebase -- worth a one-line comment when Task 6 removes the wrapper, not blocking.

## Task 5
Task 5: complete (commit c6e50b3, review clean, scoped count confirmed 31 -- first task in this plan with zero discovered gaps)

## Task 6
Task 6: complete (commit 7ca16bc, review clean -- implementation correctly follows the brief in every respect)

IMPORTANT FINDING (plan-design gap, not implementer error -- surfaced by final task reviewer on opus, independently verified): the folio_sequence redesign removes the de-facto idempotency guard against duplicate Certificate rows. Old folio format (D360-YYYY-MMDD-employeeId-courseId) was deterministic, so two concurrent syncs creating "the same" certificate would collide on reference_number's @unique constraint, and the existing P2002 catch in upsertEmployeeCertificatesFromBridge silently absorbed the race. New folio uses a random nextval() sequence value per attempt, so that collision can never happen -- two concurrent syncs (webhook + poll + page-refresh, all three documented as converging paths in CLAUDE.md, with the in-flight dedup Set being per-process-only and therefore useless across serverless instances) can now both successfully insert a Certificate row for the same employee+course pair. Certificate has reference_number @unique and @@index([employee_id]) but no @@unique([employee_id, wp_course_id]) to replace the guard that was lost.
Not blocking Plan 2's remaining tasks (7,8,9 don't depend on this constraint) so the SDD loop continues. Requires a follow-up: add @@unique([employee_id, wp_course_id]) to Certificate in prisma/schema.prisma plus a small migration -- out of Plan 2's scope (pure lib/ TypeScript, no DDL). Flagging to the user directly rather than silently parking it, given this affects official DC-3 compliance documents. Candidate to bundle with the already-known Plan-1-follow-up (migration baseline/squash, needed before any fresh-DB provisioning) since both are schema-adjacent cleanup items outside the current plan sequence.
Task 7: complete (commit ae383a6, review clean, scoped count confirmed 8)
Task 8: complete (commit e205431, review clean, scoped count confirmed 0)
Task 9: complete (commit a0559a6, review clean, scoped count confirmed 0)

All 9 tasks complete. Proceeding to final whole-branch review.
