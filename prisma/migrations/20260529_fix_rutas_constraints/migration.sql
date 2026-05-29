-- AlterTable
ALTER TABLE "rutas_aprendizaje" ALTER COLUMN "descripcion" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ruta_cursos" ADD CONSTRAINT "ruta_cursos_ruta_id_wp_curso_id_key" UNIQUE ("ruta_id", "wp_curso_id");
