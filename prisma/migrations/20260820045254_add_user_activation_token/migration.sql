-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activation_token" TEXT,
ADD COLUMN     "activation_token_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_activation_token_key" ON "users"("activation_token");
