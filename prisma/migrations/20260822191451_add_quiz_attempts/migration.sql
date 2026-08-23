-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "wp_course_id" INTEGER NOT NULL,
    "wp_quiz_id" INTEGER NOT NULL,
    "wp_attempt_id" INTEGER NOT NULL,
    "quiz_name" TEXT,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "total_answered_questions" INTEGER NOT NULL DEFAULT 0,
    "total_marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earned_marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempt_status" TEXT,
    "result" TEXT,
    "attempt_started_at" TIMESTAMP(3),
    "attempt_ended_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_wp_attempt_id_key" ON "quiz_attempts"("wp_attempt_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_employee_id_idx" ON "quiz_attempts"("employee_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_employee_id_wp_course_id_idx" ON "quiz_attempts"("employee_id", "wp_course_id");

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

