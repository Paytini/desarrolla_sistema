-- CreateTable
CREATE TABLE "lesson_completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "wp_course_id" INTEGER NOT NULL,
    "wp_lesson_id" INTEGER NOT NULL,
    "lesson_name" TEXT,
    "completed_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_completions_employee_id_idx" ON "lesson_completions"("employee_id");

-- CreateIndex
CREATE INDEX "lesson_completions_employee_id_wp_course_id_idx" ON "lesson_completions"("employee_id", "wp_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_completions_employee_id_wp_lesson_id_key" ON "lesson_completions"("employee_id", "wp_lesson_id");

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

