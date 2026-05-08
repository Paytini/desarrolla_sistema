CREATE TABLE "integracion_estados" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracion_estados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integracion_estados_clave_key" ON "integracion_estados"("clave");
