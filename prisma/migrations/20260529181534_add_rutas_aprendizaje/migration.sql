-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "ruta_aprendizaje_id" INTEGER;

-- AlterTable
ALTER TABLE "paquete_cursos" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "num_lecciones" INTEGER;

-- CreateTable
CREATE TABLE "rutas_aprendizaje" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_aprendizaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruta_cursos" (
    "id" SERIAL NOT NULL,
    "ruta_id" INTEGER NOT NULL,
    "wp_curso_id" INTEGER NOT NULL,
    "nombre_curso" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "ruta_cursos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ruta_cursos_ruta_id_idx" ON "ruta_cursos"("ruta_id");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_ruta_aprendizaje_id_fkey" FOREIGN KEY ("ruta_aprendizaje_id") REFERENCES "rutas_aprendizaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_cursos" ADD CONSTRAINT "ruta_cursos_ruta_id_fkey" FOREIGN KEY ("ruta_id") REFERENCES "rutas_aprendizaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;
