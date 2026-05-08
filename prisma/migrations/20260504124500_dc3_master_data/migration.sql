ALTER TABLE "empresas"
ADD COLUMN "representante_legal" TEXT,
ADD COLUMN "representante_laboral" TEXT;

ALTER TABLE "empleados"
ADD COLUMN "curp" TEXT,
ADD COLUMN "ocupacion_especifica_clave" TEXT,
ADD COLUMN "ocupacion_especifica" TEXT;
