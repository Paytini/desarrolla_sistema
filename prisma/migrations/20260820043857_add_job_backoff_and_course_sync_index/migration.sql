-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "next_attempt_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "employee_courses_last_synced_at_idx" ON "employee_courses"("last_synced_at");
