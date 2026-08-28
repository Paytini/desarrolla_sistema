-- DropIndex
DROP INDEX "users_activation_token_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "activation_token",
DROP COLUMN "activation_token_expires_at";
