-- CreateTable
CREATE TABLE "auditoria_eventos" (
    "id" SERIAL NOT NULL,
    "actor_usuario_id" INTEGER,
    "actor_nombre" TEXT NOT NULL,
    "actor_email" TEXT,
    "actor_rol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" INTEGER,
    "empresa_id" INTEGER,
    "resumen" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_cupos" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "actor_usuario_id" INTEGER,
    "actor_nombre" TEXT NOT NULL,
    "actor_email" TEXT,
    "actor_rol" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalle" TEXT,
    "asientos_contratados_antes" INTEGER NOT NULL,
    "asientos_contratados_despues" INTEGER NOT NULL,
    "asientos_usados_antes" INTEGER NOT NULL,
    "asientos_usados_despues" INTEGER NOT NULL,
    "empleados_suspendidos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_cupos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_eventos_created_at_idx" ON "auditoria_eventos"("created_at");

-- CreateIndex
CREATE INDEX "auditoria_eventos_empresa_id_idx" ON "auditoria_eventos"("empresa_id");

-- CreateIndex
CREATE INDEX "auditoria_eventos_accion_idx" ON "auditoria_eventos"("accion");

-- CreateIndex
CREATE INDEX "historial_cupos_empresa_id_idx" ON "historial_cupos"("empresa_id");

-- CreateIndex
CREATE INDEX "historial_cupos_created_at_idx" ON "historial_cupos"("created_at");
