-- AlterTable
ALTER TABLE "paquetes"
ADD COLUMN "modo_entrega" TEXT NOT NULL DEFAULT 'DIRECT_ENROLLMENT',
ADD COLUMN "wp_bundle_id" INTEGER,
ADD COLUMN "nombre_bundle" TEXT,
ADD COLUMN "notas_operativas" TEXT;

-- AlterTable
ALTER TABLE "empleado_cursos"
ADD COLUMN "acceso_estado" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "acceso_origen" TEXT,
ADD COLUMN "acceso_error" TEXT,
ADD COLUMN "ultimo_intento_acceso" TIMESTAMP(3);
