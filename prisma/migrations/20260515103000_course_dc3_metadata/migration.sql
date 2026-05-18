CREATE TABLE "curso_dc3_metadata" (
  "id" SERIAL NOT NULL,
  "wp_curso_id" INTEGER NOT NULL,
  "nombre_curso" TEXT,
  "duracion_horas" DOUBLE PRECISION,
  "area_tematica_nombre" TEXT,
  "area_tematica_clave" TEXT,
  "agente_capacitador_nombre" TEXT,
  "agente_capacitador_registro" TEXT,
  "instructor_nombre" TEXT,
  "instructor_firma_url" TEXT,
  "fuente" TEXT NOT NULL DEFAULT 'MANUAL',
  "ultima_sincronizacion" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "curso_dc3_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curso_dc3_metadata_wp_curso_id_key" ON "curso_dc3_metadata"("wp_curso_id");
CREATE INDEX "curso_dc3_metadata_wp_curso_id_idx" ON "curso_dc3_metadata"("wp_curso_id");
