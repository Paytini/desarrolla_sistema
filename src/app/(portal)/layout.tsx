import { Suspense } from "react"
import { PortalThemeProvider } from "@/components/providers/PortalThemeProvider"
import { PageSkeleton } from "@/components/shared/PageSkeleton"
import { FullscreenToggle } from "@/components/layout/FullscreenToggle"
import { MobileNav } from "@/components/layout/MobileNav"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { TopbarUserMenu } from "@/components/layout/TopbarUserMenu"
import Sidebar from "@/components/layout/Sidebar"
import { OnboardingTour } from "@/components/layout/OnboardingTour"
import EmployeeSearchBar from "@/components/search/EmployeeSearchBar"
import HrSearchBar from "@/components/search/HrSearchBar"
import SuperadminSearchBar from "@/components/search/SuperadminSearchBar"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"
import { storageProxyUrl } from "@/lib/storage-proxy"
import { getCompanyBranding } from "@/lib/company/branding"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  const role = session.user.role as "SUPERADMIN" | "HR" | "EMPLOYEE"
  const name = session.user.nombre as string
  const email = session.user.email ?? name
  const company = session.user.empresa as string | undefined

  const branding =
    (role === "HR" || role === "EMPLOYEE") && session.user.empresa_id
      ? await getCompanyBranding(session.user.empresa_id)
      : null

  const logoSrc = branding?.logo_url ? storageProxyUrl(branding.logo_url) : null
  const companyName = company ?? branding?.name ?? undefined

  const content = (
    <div className={cn("relative flex h-screen overflow-hidden bg-portal-page-bg", "portal-v4")}>
      <Sidebar
        role={role}
        companySlug={branding?.slug}
        logoSrc={logoSrc}
        logoAlt={companyName ?? "Logo de la empresa"}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 bg-portal-page-bg px-4 min-[900px]:px-8">
          <div className="min-[900px]:hidden">
            <MobileNav role={role} name={name} companySlug={branding?.slug} />
          </div>
          {role === "SUPERADMIN" ? (
            <SuperadminSearchBar />
          ) : role === "HR" ? (
            branding?.slug && <HrSearchBar companySlug={branding.slug} />
          ) : (
            <EmployeeSearchBar />
          )}
          <div className="flex flex-1 items-center justify-end gap-1">
            <NotificationBell />
            <FullscreenToggle />
            <TopbarUserMenu
              name={name}
              companyName={role !== "SUPERADMIN" ? companyName : undefined}
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-portal-page-bg px-8 py-7">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>

      {(role === "HR" || role === "EMPLOYEE") && <OnboardingTour role={role} userId={email} />}
    </div>
  )

  return <PortalThemeProvider>{content}</PortalThemeProvider>
}
