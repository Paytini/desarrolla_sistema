-- AlterTable
ALTER TABLE "employee_courses" ADD COLUMN     "access_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "employee_courses_access_expires_at_idx" ON "employee_courses"("access_expires_at");

