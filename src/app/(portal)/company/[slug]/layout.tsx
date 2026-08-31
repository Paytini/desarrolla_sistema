import { notFound, redirect } from "next/navigation"
import { requireHrSession } from "@/lib/auth-guards"
import { getCompanyBranding } from "@/lib/company/branding"
import { companyPath } from "@/lib/company/routes"

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await requireHrSession()

  const branding = await getCompanyBranding(session.user.empresa_id as string)
  if (!branding) notFound()

  // The URL slug is cosmetic, not a security boundary — data access is scoped by
  // session.empresa_id (see requireHrSession/tenant-guard). This just keeps the
  // address bar honest and redirects anyone who typed/bookmarked the wrong one.
  if (branding.slug !== slug) redirect(companyPath(branding.slug))

  return <>{children}</>
}
