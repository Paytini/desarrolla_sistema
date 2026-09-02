-- DropForeignKey
ALTER TABLE "portal_sessions" DROP CONSTRAINT "portal_sessions_user_id_fkey";

-- DropTable
DROP TABLE "portal_sessions";
