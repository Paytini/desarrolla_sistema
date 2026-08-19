import { cache } from "react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

// Cached per-request: cheap to call from layouts and actions alike without
// worrying about duplicate queries or a stale slug in the session JWT.
export const getCompanyBranding = cache(async (companyId: string) => {
  return prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true, logo_url: true, name: true },
  })
})

export async function requireCompanySlug(companyId: string) {
  const branding = await getCompanyBranding(companyId)
  if (!branding) redirect("/login")
  return branding.slug
}
