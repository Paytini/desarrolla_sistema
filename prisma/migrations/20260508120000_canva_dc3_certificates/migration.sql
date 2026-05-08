ALTER TABLE "constancias"
ADD COLUMN "canva_estado" TEXT,
ADD COLUMN "canva_design_id" TEXT,
ADD COLUMN "canva_design_url" TEXT,
ADD COLUMN "canva_edit_url" TEXT,
ADD COLUMN "canva_export_url" TEXT,
ADD COLUMN "canva_export_expires_at" TIMESTAMP(3),
ADD COLUMN "canva_generada_at" TIMESTAMP(3),
ADD COLUMN "canva_error" TEXT;
