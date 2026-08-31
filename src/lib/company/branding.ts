import { cache } from "react"
import { redirect } from "next/navigation"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { companyCacheRootTag } from "@/lib/cache-tags"

// Cached per-request: cheap to call from layouts and actions alike without
// worrying about duplicate queries or a stale slug in the session JWT.
export const getCompanyBranding = cache(async (companyId: string) => {
  const branding = unstable_cache(
    () =>
      prisma.company.findUnique({
        where: { id: companyId },
        select: { slug: true, logo_url: true, name: true },
      }),
    ["company-branding", String(companyId)],
    { revalidate: 45, tags: [companyCacheRootTag(companyId)] },
  )

  return branding()
})

export async function requireCompanySlug(companyId: string) {
  const branding = await getCompanyBranding(companyId)
  if (!branding) redirect("/login")
  return branding.slug
}
