-- DropForeignKey
ALTER TABLE "ruta_cursos" DROP CONSTRAINT "ruta_cursos_ruta_id_fkey";

-- DropForeignKey
ALTER TABLE "empresas" DROP CONSTRAINT "empresas_ruta_aprendizaje_id_fkey";

-- AlterTable
ALTER TABLE "empresas" DROP COLUMN "ruta_aprendizaje_id";

-- DropTable
DROP TABLE "ruta_cursos";

-- DropTable
DROP TABLE "rutas_aprendizaje";
