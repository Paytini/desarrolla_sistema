-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notifications_user_id_archived_idx" ON "notifications"("user_id", "archived");
