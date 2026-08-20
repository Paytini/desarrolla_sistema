import { Suspense } from "react";
import { PortalThemeProvider } from "@/components/providers/PortalThemeProvider";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import EmployeeSearchBar from "@/components/search/EmployeeSearchBar";
import { FullscreenToggle } from "@/components/layout/FullscreenToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { PortalGreeting } from "@/components/layout/PortalGreeting";
import HrSearchBar from "@/components/search/HrSearchBar";
import SuperadminSearchBar from "@/components/search/SuperadminSearchBar";
import Sidebar from "@/components/layout/Sidebar";
import { TopbarUserMenu } from "@/components/layout/TopbarUserMenu";
import { OnboardingTour } from "@/components/layout/OnboardingTour";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { getCompanyBranding } from "@/lib/company-branding";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = session.user.role as "SUPERADMIN" | "HR" | "EMPLOYEE";
  const name = session.user.nombre as string;
  const email = session.user.email ?? name;
  const company = session.user.empresa as string | undefined;
  const isSuperAdmin = role === "SUPERADMIN";

  const branding =
    (role === "HR" || role === "EMPLOYEE") && session.user.empresa_id
      ? await getCompanyBranding(session.user.empresa_id)
      : null;

  const content = (
    <div className={cn("flex h-screen overflow-hidden", "portal-v4")}>
      <Sidebar
        role={role}
        companySlug={branding?.slug}
        companyName={company}
        companyLogoUrl={branding?.logo_url}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-[#E5E7EB] bg-white px-4 md:px-6">
          <MobileNav
            role={role}
            name={name}
            company={company}
            companySlug={branding?.slug}
            companyLogoUrl={branding?.logo_url}
          />

          {isSuperAdmin ? (
            <div className="flex-1" style={{ maxWidth: 560 }}>
              <SuperadminSearchBar />
            </div>
          ) : (
            <PortalGreeting name={name} role={role} />
          )}

          <div className="flex-1" />

          <div className="flex shrink-0 items-center gap-2">
            {role === "HR" && branding?.slug && (
              <HrSearchBar companySlug={branding.slug} />
            )}
            {role === "EMPLOYEE" && <EmployeeSearchBar />}
            <NotificationBell />
            <FullscreenToggle />
            <TopbarUserMenu name={name} role={role} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#F8F9FC] px-8 py-7">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </main>
      </div>

      {(role === "HR" || role === "EMPLOYEE") && (
        <OnboardingTour role={role} userId={email} />
      )}
    </div>
  );

  return <PortalThemeProvider>{content}</PortalThemeProvider>;
}
