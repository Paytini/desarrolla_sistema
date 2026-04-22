-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'RH', 'EMPLEADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa_id" INTEGER,
    "wp_user_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email_rh" TEXT NOT NULL,
    "telefono" TEXT,
    "rfc" TEXT,
    "asientos_contratados" INTEGER NOT NULL,
    "asientos_usados" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquetes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paquetes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paquete_cursos" (
    "id" SERIAL NOT NULL,
    "paquete_id" INTEGER NOT NULL,
    "wp_curso_id" INTEGER NOT NULL,
    "nombre_curso" TEXT NOT NULL,

    CONSTRAINT "paquete_cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_paquetes" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "paquete_id" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_paquetes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "wp_user_id" INTEGER,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departamento" TEXT,
    "puesto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleado_cursos" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "wp_curso_id" INTEGER NOT NULL,
    "nombre_curso" TEXT NOT NULL,
    "progreso_pct" INTEGER NOT NULL DEFAULT 0,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_inicio_curso" TIMESTAMP(3),
    "fecha_completado" TIMESTAMP(3),
    "ultima_sincronizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleado_cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constancias" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "wp_curso_id" INTEGER NOT NULL,
    "nombre_curso" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "wp_cert_url" TEXT,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "constancias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_portal" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_portal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_empresa_id_idx" ON "usuarios"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_email_rh_key" ON "empresas"("email_rh");

-- CreateIndex
CREATE INDEX "paquete_cursos_paquete_id_idx" ON "paquete_cursos"("paquete_id");

-- CreateIndex
CREATE UNIQUE INDEX "paquete_cursos_paquete_id_wp_curso_id_key" ON "paquete_cursos"("paquete_id", "wp_curso_id");

-- CreateIndex
CREATE INDEX "empresa_paquetes_empresa_id_idx" ON "empresa_paquetes"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_wp_user_id_key" ON "empleados"("wp_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_email_key" ON "empleados"("email");

-- CreateIndex
CREATE INDEX "empleados_empresa_id_idx" ON "empleados"("empresa_id");

-- CreateIndex
CREATE INDEX "empleado_cursos_empleado_id_idx" ON "empleado_cursos"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_cursos_empleado_id_wp_curso_id_key" ON "empleado_cursos"("empleado_id", "wp_curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "constancias_folio_key" ON "constancias"("folio");

-- CreateIndex
CREATE INDEX "constancias_empleado_id_idx" ON "constancias"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_portal_token_key" ON "sesiones_portal"("token");

-- CreateIndex
CREATE INDEX "sesiones_portal_usuario_id_idx" ON "sesiones_portal"("usuario_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paquete_cursos" ADD CONSTRAINT "paquete_cursos_paquete_id_fkey" FOREIGN KEY ("paquete_id") REFERENCES "paquetes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_paquetes" ADD CONSTRAINT "empresa_paquetes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_paquetes" ADD CONSTRAINT "empresa_paquetes_paquete_id_fkey" FOREIGN KEY ("paquete_id") REFERENCES "paquetes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_cursos" ADD CONSTRAINT "empleado_cursos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constancias" ADD CONSTRAINT "constancias_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_portal" ADD CONSTRAINT "sesiones_portal_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
