-- This migration was originally authored with a leading TRUNCATE and a
-- DropForeignKey section (see git history / task-2-report.md for the first
-- attempt). Both already executed successfully on the first (partial) apply of
-- this migration name before it failed partway through the AlterTable section --
-- all 16 tables are already empty and all 11 legacy FK constraints are already
-- gone. Both sections are intentionally omitted from this corrected script:
-- re-running TRUNCATE would be harmless but pointless, and re-running
-- DropForeignKey would fail immediately (constraints no longer exist).

-- audit_events is intentionally NOT altered here: its id/actor_user_id/entity_id/
-- company_id columns are already UUID and its pkey is already named
-- "audit_events_pkey" (this table's original block already applied, before the
-- migration failed on a bad trailing RENAME CONSTRAINT -- see the note above the
-- RenameIndex section). Re-running that block would DROP CONSTRAINT
-- "auditoria_eventos_pkey", which no longer exists, and fail immediately.

-- AlterTable
ALTER TABLE "certificates" DROP CONSTRAINT "constancias_pkey",
ADD COLUMN     "folio_sequence" SERIAL NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "employee_id",
ADD COLUMN     "employee_id" UUID NOT NULL,
ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "companies" DROP CONSTRAINT "empresas_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "company_packages" DROP CONSTRAINT "empresa_paquetes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "company_id",
ADD COLUMN     "company_id" UUID NOT NULL,
DROP COLUMN "package_id",
ADD COLUMN     "package_id" UUID NOT NULL,
ADD CONSTRAINT "company_packages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "consulting_requests" DROP CONSTRAINT "consulting_requests_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "company_id",
ADD COLUMN     "company_id" UUID NOT NULL,
DROP COLUMN "requested_by_user_id",
ADD COLUMN     "requested_by_user_id" UUID NOT NULL,
ADD CONSTRAINT "consulting_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "course_dc3_metadata" DROP CONSTRAINT "curso_dc3_metadata_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "course_dc3_metadata_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "employee_courses" DROP CONSTRAINT "empleado_cursos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "employee_id",
ADD COLUMN     "employee_id" UUID NOT NULL,
ADD CONSTRAINT "employee_courses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "employees" DROP CONSTRAINT "empleados_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "company_id",
ADD COLUMN     "company_id" UUID NOT NULL,
ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "integration_states" DROP CONSTRAINT "integracion_estados_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "integration_states_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notificaciones_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "entity_id",
ADD COLUMN     "entity_id" UUID,
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "package_courses" DROP CONSTRAINT "paquete_cursos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "package_id",
ADD COLUMN     "package_id" UUID NOT NULL,
ADD CONSTRAINT "package_courses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "packages" DROP CONSTRAINT "paquetes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "portal_sessions" DROP CONSTRAINT "sesiones_portal_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "seat_history" DROP CONSTRAINT "historial_cupos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "company_id",
ADD COLUMN     "company_id" UUID NOT NULL,
DROP COLUMN "actor_user_id",
ADD COLUMN     "actor_user_id" UUID,
ADD CONSTRAINT "seat_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "usuarios_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
DROP COLUMN "company_id",
ADD COLUMN     "company_id" UUID,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "audit_events_company_id_idx" ON "audit_events"("company_id");

-- CreateIndex
CREATE INDEX "certificates_employee_id_idx" ON "certificates"("employee_id");

-- CreateIndex
CREATE INDEX "company_packages_company_id_idx" ON "company_packages"("company_id");

-- CreateIndex
CREATE INDEX "consulting_requests_company_id_idx" ON "consulting_requests"("company_id");

-- CreateIndex
CREATE INDEX "employee_courses_employee_id_idx" ON "employee_courses"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_courses_employee_id_wp_course_id_key" ON "employee_courses"("employee_id", "wp_course_id");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "package_courses_package_id_idx" ON "package_courses"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_courses_package_id_wp_course_id_key" ON "package_courses"("package_id", "wp_course_id");

-- CreateIndex
CREATE INDEX "portal_sessions_user_id_idx" ON "portal_sessions"("user_id");

-- CreateIndex
CREATE INDEX "seat_history_company_id_idx" ON "seat_history"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_courses" ADD CONSTRAINT "package_courses_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_packages" ADD CONSTRAINT "company_packages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_packages" ADD CONSTRAINT "company_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulting_requests" ADD CONSTRAINT "consulting_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulting_requests" ADD CONSTRAINT "consulting_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_courses" ADD CONSTRAINT "employee_courses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
-- Only indexes on columns that keep their original type are renamed here.
-- Every index that lived on a column converted above (company_id, employee_id,
-- user_id, package_id, and their composites) was auto-dropped by Postgres when
-- that column was DROP COLUMN'd -- CASCADE is not required for that, it happens
-- unconditionally for same-table dependents -- so those are recreated fresh under
-- their final name by the CreateIndex block above instead of being renamed here.
-- A first attempt at this migration tried to both ADD CONSTRAINT/CREATE INDEX
-- under the final name AND separately RENAME CONSTRAINT/RENAME INDEX the
-- already-gone original to that same final name; the rename half always failed
-- (source object gone), and for audit_events.company_id specifically the
-- "original" name in that rename never existed on this DB to begin with
-- (pre-existing drift, unrelated to this migration).
ALTER INDEX "auditoria_eventos_accion_idx" RENAME TO "audit_events_action_idx";

-- RenameIndex
ALTER INDEX "auditoria_eventos_created_at_idx" RENAME TO "audit_events_created_at_idx";

-- RenameIndex
ALTER INDEX "constancias_folio_key" RENAME TO "certificates_reference_number_key";

-- RenameIndex
ALTER INDEX "empresas_email_rh_key" RENAME TO "companies_hr_email_key";

-- RenameIndex
ALTER INDEX "curso_dc3_metadata_wp_curso_id_idx" RENAME TO "course_dc3_metadata_wp_course_id_idx";

-- RenameIndex
ALTER INDEX "curso_dc3_metadata_wp_curso_id_key" RENAME TO "course_dc3_metadata_wp_course_id_key";

-- RenameIndex
ALTER INDEX "empleados_email_key" RENAME TO "employees_email_key";

-- RenameIndex
ALTER INDEX "empleados_wp_user_id_key" RENAME TO "employees_wp_user_id_key";

-- RenameIndex
ALTER INDEX "integracion_estados_clave_key" RENAME TO "integration_states_key_key";

-- RenameIndex
ALTER INDEX "notificaciones_created_at_idx" RENAME TO "notifications_created_at_idx";

-- RenameIndex
ALTER INDEX "sesiones_portal_token_key" RENAME TO "portal_sessions_token_key";

-- RenameIndex
ALTER INDEX "historial_cupos_created_at_idx" RENAME TO "seat_history_created_at_idx";

-- RenameIndex
ALTER INDEX "usuarios_email_key" RENAME TO "users_email_key";
