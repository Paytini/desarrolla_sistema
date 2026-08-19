-- Performance indexes (docs-observability/INFORME-RENDIMIENTO.md, hallazgo M-2).
-- Composite indexes replace single-column indexes they make redundant
-- (Postgres serves any leftmost-prefix lookup from the composite).

-- DropIndex
DROP INDEX "company_packages_company_id_idx";

-- DropIndex
DROP INDEX "employee_courses_employee_id_idx";

-- DropIndex
DROP INDEX "employees_company_id_idx";

-- CreateIndex
CREATE INDEX "certificates_wp_course_id_idx" ON "certificates"("wp_course_id");

-- CreateIndex
CREATE INDEX "company_packages_company_id_active_created_at_idx" ON "company_packages"("company_id", "active", "created_at");

-- CreateIndex
CREATE INDEX "company_packages_expiration_date_idx" ON "company_packages"("expiration_date");

-- CreateIndex
CREATE INDEX "employee_courses_employee_id_last_synced_at_idx" ON "employee_courses"("employee_id", "last_synced_at");

-- CreateIndex
CREATE INDEX "employee_courses_access_status_idx" ON "employee_courses"("access_status");

-- CreateIndex
CREATE INDEX "employee_courses_completed_idx" ON "employee_courses"("completed");

-- CreateIndex
CREATE INDEX "employees_company_id_active_idx" ON "employees"("company_id", "active");

-- CreateIndex
CREATE INDEX "notifications_type_entity_id_idx" ON "notifications"("type", "entity_id");

-- CreateIndex
CREATE INDEX "package_courses_wp_course_id_idx" ON "package_courses"("wp_course_id");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex (partial index, not representable in schema.prisma -- Prisma's
-- schema DSL has no WHERE-predicate syntax for @@index; kept here as a plain
-- hand-written addition, same as this repo's other manually-authored
-- migrations). Speeds up the mass-enrollment sync batch scan, which only
-- cares about active employees that already have a WordPress user linked.
CREATE INDEX "employees_active_with_wp_user_idx" ON "employees"("active") WHERE "wp_user_id" IS NOT NULL;
