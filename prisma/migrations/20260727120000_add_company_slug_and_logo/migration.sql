-- Add per-company branding: a URL slug (used at /company/<slug>/...) and an
-- optional logo. slug is backfilled from the existing name before being made
-- NOT NULL + UNIQUE, so this is safe to run against a table that already has rows.
-- (No `unaccent` extension dependency: accented characters just fall out of the
-- [^a-z0-9]+ match below. Superadmin can tidy up an individual slug afterwards
-- from /superadmin/companies/<id>.)

ALTER TABLE "companies" ADD COLUMN "slug" TEXT;
ALTER TABLE "companies" ADD COLUMN "logo_url" TEXT;

WITH base_slugs AS (
  SELECT
    id,
    NULLIF(
      regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
        '^-+|-+$', '', 'g'
      ),
      ''
    ) AS base_slug
  FROM "companies"
),
numbered AS (
  SELECT
    id,
    COALESCE(base_slug, 'empresa') AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(base_slug, 'empresa') ORDER BY id) AS rn
  FROM base_slugs
)
UPDATE "companies" c
SET "slug" = CASE WHEN n.rn = 1 THEN n.base_slug ELSE n.base_slug || '-' || c.id END
FROM numbered n
WHERE n.id = c.id;

ALTER TABLE "companies" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "companies" ADD CONSTRAINT "companies_slug_key" UNIQUE ("slug");
