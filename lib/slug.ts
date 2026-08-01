import { prisma } from "@/lib/prisma"

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Appends -2, -3, etc. until it finds a slug not already used by another company.
export async function ensureUniqueCompanySlug(name: string, excludeCompanyId?: number): Promise<string> {
  const base = slugify(name) || "empresa"

  const taken = await prisma.company.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeCompanyId ? { id: { not: excludeCompanyId } } : {}),
    },
    select: { slug: true },
  })
  const takenSlugs = new Set(taken.map((c) => c.slug))

  if (!takenSlugs.has(base)) return base

  let suffix = 2
  while (takenSlugs.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}
